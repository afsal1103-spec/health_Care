import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProfileImageColumns, getProfileTarget } from "@/lib/profile-utils";
import { query } from "@/lib/db";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected server error";
}

function parseDataUrlImage(input: string): { buffer: Buffer; ext: string } | null {
  const match = input.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const base64 = match[2];
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extMap[mime];
  if (!ext) return null;

  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_SIZE) return null;

  return { buffer, ext };
}

async function getExistingImageUrl(table: string, idColumn: string, userId: number): Promise<string | null> {
  const existing = await query(
    `SELECT profile_image FROM ${table} WHERE ${idColumn} = $1`,
    [userId],
  );
  return existing.rows[0]?.profile_image || null;
}

async function updateImageUrl(
  table: string,
  idColumn: string,
  userId: number,
  imageUrl: string | null,
): Promise<void> {
  await query(`UPDATE ${table} SET profile_image = $1 WHERE ${idColumn} = $2`, [imageUrl, userId]);
}

async function tryDeleteOldLocalImage(oldUrl: string | null): Promise<void> {
  if (!oldUrl || !oldUrl.startsWith("/uploads/profiles/")) return;
  const filePath = path.join(process.cwd(), "public", oldUrl.replace(/^\//, ""));
  try {
    await unlink(filePath);
  } catch {
    // Ignore file delete errors.
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const target = getProfileTarget(session.user.userType);
    if (!target) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    }

    const body = await request.json();
    const imageData = String(body?.imageData || "");
    const parsed = parseDataUrlImage(imageData);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid image. Use JPG, PNG, or WEBP under 4MB." },
        { status: 400 },
      );
    }

    await ensureProfileImageColumns();
    await mkdir(uploadDir, { recursive: true });

    const oldUrl = await getExistingImageUrl(target.table, target.idColumn, userId);
    const filename = `${target.table}-${userId}-${Date.now()}.${parsed.ext}`;
    const diskPath = path.join(uploadDir, filename);
    const publicUrl = `/uploads/profiles/${filename}`;

    await writeFile(diskPath, parsed.buffer);
    await updateImageUrl(target.table, target.idColumn, userId, publicUrl);
    await tryDeleteOldLocalImage(oldUrl);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const target = getProfileTarget(session.user.userType);
    if (!target) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    }

    await ensureProfileImageColumns();
    const oldUrl = await getExistingImageUrl(target.table, target.idColumn, userId);
    await updateImageUrl(target.table, target.idColumn, userId, null);
    await tryDeleteOldLocalImage(oldUrl);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to remove image" }, { status: 500 });
  }
}
