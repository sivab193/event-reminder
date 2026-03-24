"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { getBirthdays, addBirthday, updateBirthday, deleteBirthday } from "@/lib/birthdays"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BirthdayForm } from "@/components/birthday-form"
import { BirthdayCard } from "@/components/birthday-card"
import { Plus, LogOut, Cake, Settings, FilterX, SlidersHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { NotificationSettings } from "@/components/notification-settings"
import type { Birthday } from "@/lib/types"
import Link from "next/link"

export function BirthdayDashboard() {
  const { user, logout } = useAuth()
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Filtering & Sorting State
  const [showFilters, setShowFilters] = useState(false)
  const [filterAssociation, setFilterAssociation] = useState("")
  const [filterEventMonth, setFilterEventMonth] = useState("")
  const [filterEventYear, setFilterEventYear] = useState("")
  const [filterMeetMonth, setFilterMeetMonth] = useState("")
  const [filterMeetYear, setFilterMeetYear] = useState("")
  const [filterTimezone, setFilterTimezone] = useState("")
  const [sortBy, setSortBy] = useState("upcoming")

  useEffect(() => {
    loadBirthdays()
  }, [user])

  const loadBirthdays = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getBirthdays(user.uid)
      setBirthdays(data)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (data: Omit<Birthday, "id" | "userId" | "createdAt">) => {
    if (!user) return
    await addBirthday({ ...data, userId: user.uid })
    await loadBirthdays()
    setIsAdding(false)
  }

  const handleUpdate = async (id: string, data: Omit<Birthday, "id" | "userId" | "createdAt">) => {
    await updateBirthday(id, data)
    await loadBirthdays()
  }

  const handleDelete = async (id: string) => {
    await deleteBirthday(id)
    await loadBirthdays()
  }

  const resetFilters = () => {
    setFilterAssociation("")
    setFilterEventMonth("")
    setFilterEventYear("")
    setFilterMeetMonth("")
    setFilterMeetYear("")
    setFilterTimezone("")
    setSortBy("upcoming")
  }

  const filteredAndSortedBirthdays = useMemo(() => {
    return birthdays.filter(b => {
      if (filterAssociation) {
        const query = filterAssociation.toLowerCase()
        const searchableText = `${b.name} ${b.association || b.company || ""} ${b.type || "Birthday"} ${b.timezone || ""}`.toLowerCase()
        if (!searchableText.includes(query)) return false
      }

      if (filterEventMonth || filterEventYear) {
         const [y, m] = b.birthdate.split('-')
         if (filterEventMonth && filterEventMonth !== "all" && m !== filterEventMonth) return false
         if (filterEventYear && y !== filterEventYear && !b.unknownYear) return false
      }

      if (filterMeetMonth || filterMeetYear) {
         if (!b.meetDate) return false
         const [y, m] = b.meetDate.split('-')
         if (filterMeetMonth && filterMeetMonth !== "all" && m !== filterMeetMonth) return false
         if (filterMeetYear && y !== filterMeetYear) return false
      }

      if (filterTimezone && filterTimezone !== "all" && b.timezone !== filterTimezone) return false

      return true
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'eventDate') return a.birthdate.localeCompare(b.birthdate)
      if (sortBy === 'meetDate') {
         if (!a.meetDate) return 1 // push items without meetDate to bottom
         if (!b.meetDate) return -1
         return a.meetDate.localeCompare(b.meetDate)
      }
      
      // Default: Upcoming
      const dateA = new Date(a.birthdate + "T00:00:00")
      const dateB = new Date(b.birthdate + "T00:00:00")
      return dateA.getMonth() - dateB.getMonth() || dateA.getDate() - dateB.getDate()
    })
  }, [birthdays, filterAssociation, filterEventMonth, filterEventYear, filterMeetMonth, filterMeetYear, filterTimezone, sortBy])

  // Helper arrays for dropdowns
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' })
  }))

  return (
    <div className="flex-1 bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Cake className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">Event Reminder</h1>
              <p className="text-muted-foreground text-sm mt-1 hidden sm:block">{user?.email}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)} title="Notification Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={logout} className="hidden sm:flex">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            <Button variant="outline" size="icon" onClick={logout} className="sm:hidden" title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full custom-scrollbar relative">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Your Connections</h2>
            <p className="text-muted-foreground mt-1">
              {filteredAndSortedBirthdays.length} {filteredAndSortedBirthdays.length === 1 ? "event" : "events"} tracked
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters & Sort
            </Button>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-card border rounded-lg p-4 mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 animate-in slide-in-from-top-4 fade-in-0">
            <div>
              <label className="text-sm font-medium mb-1 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger><SelectValue placeholder="Sort order" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming Events</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="eventDate">Event Date</SelectItem>
                  <SelectItem value="meetDate">Date Met</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input 
                placeholder="Search events..." 
                value={filterAssociation} 
                onChange={(e) => setFilterAssociation(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Event Month</label>
              <Select value={filterEventMonth || "all"} onValueChange={(val) => setFilterEventMonth(val === "all" ? "" : val)}>
                <SelectTrigger><SelectValue placeholder="Any Month" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Month</SelectItem>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date Met Month</label>
              <Select value={filterMeetMonth || "all"} onValueChange={(val) => setFilterMeetMonth(val === "all" ? "" : val)}>
                <SelectTrigger><SelectValue placeholder="Any Month" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Month</SelectItem>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end mt-2">
              <Button variant="ghost" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
                <FilterX className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Loading events...</p>
            </div>
          </div>
        ) : birthdays.length === 0 ? (
          <div className="flex flex-col gap-8 max-w-xl mx-auto py-12 px-4 sm:px-0 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4 mx-auto">
              <Cake className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No events yet</h3>
            <p className="text-muted-foreground mb-6">Start tracking events to never miss an important date</p>
            <Button onClick={() => setIsAdding(true)} className="w-full sm:w-auto mx-auto mt-6">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Event
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredAndSortedBirthdays.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                <p className="text-muted-foreground">No events match your current filters.</p>
                <Button variant="link" onClick={resetFilters}>Clear filters</Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedBirthdays.map((birthday) => (
                  <BirthdayCard key={birthday.id} birthday={birthday} onUpdate={handleUpdate} onDelete={handleDelete} />
                ))}
              </div>
            )}
            </div>
          )}
        </div>
      </main>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>Fill in the details to track a new event.</DialogDescription>
          </DialogHeader>
          <BirthdayForm onSubmit={handleAdd} onCancel={() => setIsAdding(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] lg:max-w-[900px] max-h-[90vh] flex flex-col bg-[#111318] border-gray-800 rounded-xl overflow-hidden p-0 gap-0 [&>button]:top-5 [&>button]:right-5 [&>button]:z-[60]">
          <NotificationSettings />
        </DialogContent>
      </Dialog>
    </div>
  )
}
