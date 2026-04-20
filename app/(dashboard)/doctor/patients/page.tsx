"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, CalendarDays } from "lucide-react";

interface Appointment {
  id: number;
  patientId: number;
  patientName?: string;
  appointmentDate: string;
  status?: string;
  symptoms?: string;
  diseaseCategory?: string;
}

interface PatientRow {
  patientId: number;
  name: string;
  visitCount: number;
  lastDate: string;
  lastStatus: string;
  lastSymptoms: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700 border-green-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  no_show: "bg-gray-100 text-gray-600 border-gray-200",
};

type SortKey = "name" | "visitCount" | "lastDate";

export default function DoctorPatientsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("lastDate");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/appointments");
        if (r.ok) {
          const j = await r.json();
          setAppointments(Array.isArray(j) ? j : []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Aggregate appointments → unique patient rows
  const allPatients: PatientRow[] = useMemo(() => {
    const map = new Map<
      number,
      {
        name: string;
        visitCount: number;
        lastDate: string;
        lastStatus: string;
        lastSymptoms: string;
      }
    >();

    for (const a of appointments) {
      const key = a.patientId;
      const name = a.patientName || `Patient #${a.patientId}`;
      const prev = map.get(key);

      if (!prev) {
        map.set(key, {
          name,
          visitCount: 1,
          lastDate: a.appointmentDate || "",
          lastStatus: a.status || "",
          lastSymptoms: a.symptoms || "",
        });
      } else {
        prev.visitCount += 1;
        if (
          a.appointmentDate &&
          (!prev.lastDate || a.appointmentDate > prev.lastDate)
        ) {
          prev.lastDate = a.appointmentDate;
          prev.lastStatus = a.status || "";
          prev.lastSymptoms = a.symptoms || "";
        }
        map.set(key, prev);
      }
    }

    return Array.from(map.entries()).map(([patientId, info]) => ({
      patientId,
      ...info,
    }));
  }, [appointments]);

  // Search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPatients;
    return allPatients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.patientId).includes(q) ||
        p.lastSymptoms.toLowerCase().includes(q),
    );
  }, [allPatients, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === "visitCount") {
        cmp = a.visitCount - b.visitCount;
      } else if (sortBy === "lastDate") {
        cmp = (a.lastDate || "").localeCompare(b.lastDate || "");
      }
      return order === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortBy, order]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleSortBy = (val: SortKey) => {
    if (sortBy === val) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(val);
      setOrder("asc");
    }
    setPage(1);
  };

  const SortIndicator = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return (
      <span className="ml-1 text-primary">{order === "asc" ? "↑" : "↓"}</span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Patients</h1>
        <p className="text-gray-500 mt-1">
          All patients you have seen or have appointments with
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Patient List
              {!loading && (
                <Badge variant="secondary" className="ml-1">
                  {filtered.length}
                </Badge>
              )}
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search name / symptoms..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 w-60"
                />
              </div>

              {/* Sort by */}
              <select
                className="border rounded px-2 py-2 text-sm"
                value={sortBy}
                onChange={(e) => handleSortBy(e.target.value as SortKey)}
              >
                <option value="lastDate">Sort: Last Visit</option>
                <option value="name">Sort: Name</option>
                <option value="visitCount">Sort: Visits</option>
              </select>

              {/* Order toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOrder((o) => (o === "asc" ? "desc" : "asc"));
                  setPage(1);
                }}
              >
                {order === "asc" ? "↑ Asc" : "↓ Desc"}
              </Button>

              {/* Page size */}
              <select
                className="border rounded px-2 py-2 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(parseInt(e.target.value, 10));
                }}
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading && (
            <div className="py-10 text-center text-gray-400 animate-pulse">
              Loading patients…
            </div>
          )}

          {!loading && (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSortBy("name")}
                      >
                        Patient Name <SortIndicator col="name" />
                      </TableHead>
                      <TableHead>Patient ID</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSortBy("visitCount")}
                      >
                        Total Visits <SortIndicator col="visitCount" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSortBy("lastDate")}
                      >
                        Last Visit <SortIndicator col="lastDate" />
                      </TableHead>
                      <TableHead>Last Status</TableHead>
                      <TableHead>Last Symptoms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-gray-400 py-10"
                        >
                          {search
                            ? "No patients match your search."
                            : "No patients found yet."}
                        </TableCell>
                      </TableRow>
                    )}
                    {paginated.map((p, idx) => (
                      <TableRow key={p.patientId} className="hover:bg-gray-50">
                        <TableCell className="text-gray-400 text-sm">
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {p.name}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          #{p.patientId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {p.visitCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(p.lastDate)}
                        </TableCell>
                        <TableCell>
                          {p.lastStatus ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                STATUS_COLORS[p.lastStatus] ??
                                "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {p.lastStatus.replace("_", " ")}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                          {p.lastSymptoms || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {paginated.length === 0 && (
                  <p className="text-center text-gray-400 py-8">
                    {search
                      ? "No patients match your search."
                      : "No patients found yet."}
                  </p>
                )}
                {paginated.map((p) => (
                  <Card key={p.patientId} className="border shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            Patient ID #{p.patientId}
                          </p>
                        </div>
                        {p.lastStatus && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              STATUS_COLORS[p.lastStatus] ??
                              "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {p.lastStatus.replace("_", " ")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-primary">
                            {p.visitCount}
                          </span>{" "}
                          visit{p.visitCount !== 1 ? "s" : ""}
                        </div>
                        <span>{formatDate(p.lastDate)}</span>
                      </div>

                      {p.lastSymptoms && (
                        <p className="text-xs text-gray-500 truncate">
                          Symptoms: {p.lastSymptoms}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} · {filtered.length} patient
                  {filtered.length !== 1 ? "s" : ""}
                  {search && ` (filtered from ${allPatients.length})`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
