"use client";

import { useEffect, useState } from "react";
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
import { Search, Stethoscope, GraduationCap, Clock, Star } from "lucide-react";

interface Doctor {
  id: number;
  name: string;
  specialist: string;
  education: string;
  experienceYears: number;
  consultationFee: number;
  rating: number | null;
  availableDays: string[];
  availableTimeStart: string;
  availableTimeEnd: string;
}

function formatTime(time: string) {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return time;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PatientDoctorsPage() {
  const [data, setData] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "specialist" | "consultationFee" | "rating"
  >("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        search,
        sortBy,
        order,
        page: String(page),
        pageSize: String(pageSize),
      }).toString();
      const res = await fetch(`/api/doctors/master?${qs}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.items || []);
        setTotal(json.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortBy, order, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Our Doctors</h1>
        <p className="text-gray-500 mt-1">
          Browse our team of qualified healthcare professionals
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              All Doctors
              {!loading && (
                <Badge variant="secondary" className="ml-1">
                  {total}
                </Badge>
              )}
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search name / specialist..."
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  className="pl-8 w-60"
                />
              </div>

              {/* Sort by */}
              <select
                className="border rounded px-2 py-2 text-sm"
                value={sortBy}
                onChange={(e) => {
                  setPage(1);
                  setSortBy(e.target.value as typeof sortBy);
                }}
              >
                <option value="name">Sort: Name</option>
                <option value="specialist">Sort: Specialist</option>
                <option value="consultationFee">Sort: Fee</option>
                <option value="rating">Sort: Rating</option>
              </select>

              {/* Order toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
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
              Loading doctors…
            </div>
          )}

          {!loading && (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Specialist</TableHead>
                      <TableHead>Education</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Available Days</TableHead>
                      <TableHead>Timings</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-gray-400 py-10"
                        >
                          No doctors found.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.map((doc, idx) => (
                      <TableRow key={doc.id} className="hover:bg-gray-50">
                        <TableCell className="text-gray-400 text-sm">
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            Dr. {doc.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-primary border-primary/40"
                          >
                            {doc.specialist || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                            {doc.education || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {doc.experienceYears != null
                            ? `${doc.experienceYears} yr${doc.experienceYears !== 1 ? "s" : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(doc.availableDays ?? []).map((d) => (
                              <Badge
                                key={d}
                                variant="secondary"
                                className="text-xs px-1.5 py-0"
                              >
                                {d.slice(0, 3)}
                              </Badge>
                            ))}
                            {(!doc.availableDays ||
                              doc.availableDays.length === 0) && (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {doc.availableTimeStart
                              ? `${formatTime(doc.availableTimeStart)} – ${formatTime(doc.availableTimeEnd)}`
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary whitespace-nowrap">
                          {doc.consultationFee != null
                            ? formatCurrency(doc.consultationFee)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {doc.rating != null ? (
                            <div className="flex items-center gap-1 text-amber-500 font-medium text-sm">
                              <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                              {Number(doc.rating).toFixed(1)}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-4">
                {data.length === 0 && (
                  <p className="text-center text-gray-400 py-8">
                    No doctors found.
                  </p>
                )}
                {data.map((doc) => (
                  <Card key={doc.id} className="border shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Dr. {doc.name}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-primary border-primary/40 mt-1"
                          >
                            {doc.specialist}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {doc.consultationFee != null
                              ? formatCurrency(doc.consultationFee)
                              : "—"}
                          </p>
                          {doc.rating != null && (
                            <div className="flex items-center justify-end gap-1 text-amber-500 text-sm mt-0.5">
                              <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                              {Number(doc.rating).toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {doc.education || "—"}{" "}
                        {doc.experienceYears != null &&
                          `· ${doc.experienceYears} yrs exp`}
                      </div>

                      {doc.availableTimeStart && (
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(doc.availableTimeStart)} –{" "}
                          {formatTime(doc.availableTimeEnd)}
                        </div>
                      )}

                      {doc.availableDays && doc.availableDays.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {doc.availableDays.map((d) => (
                            <Badge
                              key={d}
                              variant="secondary"
                              className="text-xs px-1.5 py-0"
                            >
                              {d.slice(0, 3)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} · {total} doctor
                  {total !== 1 ? "s" : ""}
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
