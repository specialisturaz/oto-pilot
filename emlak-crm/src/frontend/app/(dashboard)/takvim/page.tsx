"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TURKISH_MONTHS = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
];

const TURKISH_DAYS = ["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"];

type AppointmentType = "gosterim" | "toplanti" | "tapu_randevusu";

interface Appointment {
  id: string;
  title: string;
  type: AppointmentType;
  date: string;
  time: string;
  contact: string;
  location: string;
  phone: string;
}

const appointmentTypeMap: Record<
  AppointmentType,
  { label: string; color: string; dotColor: string; variant: "info" | "success" | "destructive" }
> = {
  gosterim: {
    label: "Gosterim",
    color: "bg-blue-500",
    dotColor: "bg-blue-500",
    variant: "info",
  },
  toplanti: {
    label: "Toplanti",
    color: "bg-emerald-500",
    dotColor: "bg-emerald-500",
    variant: "success",
  },
  tapu_randevusu: {
    label: "Tapu Randevusu",
    color: "bg-red-500",
    dotColor: "bg-red-500",
    variant: "destructive",
  },
};

// Mock data
const mockAppointments: Appointment[] = [
  {
    id: "1",
    title: "Kadikoy 3+1 Daire Gosterimi",
    type: "gosterim",
    date: "2026-03-28",
    time: "10:00",
    contact: "Ahmet Yilmaz",
    location: "Kadikoy, Istanbul",
    phone: "5321234567",
  },
  {
    id: "2",
    title: "Ofis Toplantisi",
    type: "toplanti",
    date: "2026-03-28",
    time: "14:00",
    contact: "Mehmet Danisman",
    location: "Merkez Ofis",
    phone: "5339876543",
  },
  {
    id: "3",
    title: "Besiktas Villa Tapu Devri",
    type: "tapu_randevusu",
    date: "2026-03-30",
    time: "09:30",
    contact: "Zeynep Arslan",
    location: "Besiktas Tapu Mudurlugu",
    phone: "5054443322",
  },
  {
    id: "4",
    title: "Atasehir Residence Gosterimi",
    type: "gosterim",
    date: "2026-03-31",
    time: "11:00",
    contact: "Fatma Demir",
    location: "Atasehir, Istanbul",
    phone: "5411112233",
  },
  {
    id: "5",
    title: "Haftalik Satis Toplantisi",
    type: "toplanti",
    date: "2026-04-01",
    time: "09:00",
    contact: "Tum Ekip",
    location: "Merkez Ofis",
    phone: "-",
  },
  {
    id: "6",
    title: "Bakirkoy Dublex Gosterimi",
    type: "gosterim",
    date: "2026-04-03",
    time: "15:00",
    contact: "Mustafa Kaya",
    location: "Bakirkoy, Istanbul",
    phone: "5367778899",
  },
  {
    id: "7",
    title: "Maltepe Daire Tapu Islemleri",
    type: "tapu_randevusu",
    date: "2026-04-07",
    time: "10:00",
    contact: "Hasan Yildiz",
    location: "Maltepe Tapu Mudurlugu",
    phone: "5429998877",
  },
  {
    id: "8",
    title: "Sisli Ofis Gosterimi",
    type: "gosterim",
    date: "2026-03-29",
    time: "13:00",
    contact: "Ali Celik",
    location: "Sisli, Istanbul",
    phone: "5367778899",
  },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  // Convert from Sunday=0 to Monday=0
  return day === 0 ? 6 : day - 1;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function TakvimPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  );

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Group appointments by date
  const appointmentsByDate: Record<string, Appointment[]> = {};
  mockAppointments.forEach((apt) => {
    if (!appointmentsByDate[apt.date]) {
      appointmentsByDate[apt.date] = [];
    }
    appointmentsByDate[apt.date].push(apt);
  });

  const selectedAppointments = selectedDate
    ? appointmentsByDate[selectedDate] || []
    : [];

  // Upcoming appointments (sorted by date and time)
  const upcomingAppointments = mockAppointments
    .filter((apt) => apt.date >= formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    })
    .slice(0, 5);

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(
      formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())
    );
  };

  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Takvim</h1>
          <p className="text-muted-foreground">
            Randevularinizi ve gorevlerinizi yonetin
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Randevu
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {TURKISH_MONTHS[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Bugun
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToPreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToNextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px">
              {TURKISH_DAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-px">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return (
                    <div key={`empty-${index}`} className="min-h-[80px] p-1" />
                  );
                }

                const dateKey = formatDateKey(currentYear, currentMonth, day);
                const dayAppointments = appointmentsByDate[dateKey] || [];
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;

                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-[80px] cursor-pointer rounded-md border p-1 transition-colors hover:bg-accent/50",
                      isToday && "border-primary",
                      isSelected && "bg-accent"
                    )}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday && "bg-primary text-primary-foreground"
                      )}
                    >
                      {day}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayAppointments.slice(0, 3).map((apt) => {
                        const typeInfo = appointmentTypeMap[apt.type];
                        return (
                          <div
                            key={apt.id}
                            className="flex items-center gap-1"
                          >
                            <div
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                typeInfo.dotColor
                              )}
                            />
                            <span className="truncate text-[10px] text-muted-foreground">
                              {apt.time} {apt.title.slice(0, 15)}
                            </span>
                          </div>
                        );
                      })}
                      {dayAppointments.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{dayAppointments.length - 3} daha
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 border-t pt-4">
              {Object.entries(appointmentTypeMap).map(([key, info]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <div
                    className={cn("h-2.5 w-2.5 rounded-full", info.dotColor)}
                  />
                  <span>{info.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Selected Date Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate
                  ? (() => {
                      const parts = selectedDate.split("-");
                      return `${parts[2]} ${TURKISH_MONTHS[parseInt(parts[1]) - 1]} ${parts[0]}`;
                    })()
                  : "Gun Secin"}
              </CardTitle>
              <CardDescription>
                {selectedAppointments.length > 0
                  ? `${selectedAppointments.length} randevu`
                  : "Bu gun icin randevu yok"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedAppointments.length > 0 ? (
                <div className="space-y-3">
                  {selectedAppointments.map((apt) => {
                    const typeInfo = appointmentTypeMap[apt.type];
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          "rounded-lg border-l-4 border p-3",
                          apt.type === "gosterim" && "border-l-blue-500",
                          apt.type === "toplanti" && "border-l-emerald-500",
                          apt.type === "tapu_randevusu" && "border-l-red-500"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium">{apt.title}</h4>
                          <Badge variant={typeInfo.variant} className="text-[10px]">
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {apt.time}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {apt.contact}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {apt.location}
                          </div>
                          {apt.phone !== "-" && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {apt.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Bu gun icin randevu bulunmuyor
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Yaklasan Randevular</CardTitle>
              <CardDescription>
                Onumuzdeki randevulariniz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => {
                  const typeInfo = appointmentTypeMap[apt.type];
                  const dateParts = apt.date.split("-");
                  const displayDate = `${dateParts[2]} ${TURKISH_MONTHS[parseInt(dateParts[1]) - 1]}`;
                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            apt.type === "gosterim" && "bg-blue-100 text-blue-600",
                            apt.type === "toplanti" && "bg-emerald-100 text-emerald-600",
                            apt.type === "tapu_randevusu" && "bg-red-100 text-red-600"
                          )}
                        >
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium line-clamp-1">
                            {apt.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.contact}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium">{displayDate}</p>
                        <p className="text-xs text-muted-foreground">
                          {apt.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
