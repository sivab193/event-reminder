"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TIMEZONES } from "@/lib/types"
import type { Birthday } from "@/lib/types"

interface BirthdayFormProps {
  onSubmit: (data: Omit<Birthday, "id" | "userId" | "createdAt">) => Promise<void>
  onCancel: () => void
  initialData?: Birthday
}

export function BirthdayForm({ onSubmit, onCancel, initialData }: BirthdayFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    association: initialData?.association || initialData?.company || "",
    type: initialData?.type || "birthday",
    customType: initialData?.type && !['birthday', 'anniversary'].includes(initialData.type) ? initialData.type : "",
    unknownYear: initialData?.unknownYear || false,
    birthdate: initialData?.birthdate || "",
    meetDate: initialData?.meetDate || "",
    timezone: initialData?.timezone || "Asia/Kolkata",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name: formData.name,
        association: formData.association,
        company: formData.association, // backwards compatibility
        type: formData.type === 'other' ? formData.customType : formData.type,
        unknownYear: formData.unknownYear,
        birthdate: formData.birthdate,
        meetDate: formData.meetDate,
        timezone: formData.timezone
      }
      await onSubmit(payload)
    } finally {
      setLoading(false)
    }
  }

  const MONTHS = [
    { value: "01", label: "January" }, { value: "02", label: "February" },
    { value: "03", label: "March" }, { value: "04", label: "April" },
    { value: "05", label: "May" }, { value: "06", label: "June" },
    { value: "07", label: "July" }, { value: "08", label: "August" },
    { value: "09", label: "September" }, { value: "10", label: "October" },
    { value: "11", label: "November" }, { value: "12", label: "December" }
  ]
  const DAYS = Array.from({length: 31}, (_, i) => String(i + 1).padStart(2, '0'))

  const isPersonEvent = formData.type === 'birthday' || formData.type === 'anniversary'
  const getSubmitLabel = () => {
    if (initialData) return "Update"
    if (formData.type === 'other') return `Add ${formData.customType || 'Event'}`
    return `Add ${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Row 1: Name and Type */}
        <div className="space-y-2">
          <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Event Type <span className="text-destructive">*</span></Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger id="type" className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="birthday">Birthday</SelectItem>
              <SelectItem value="anniversary">Anniversary</SelectItem>
              <SelectItem value="other">Custom Event</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 1.5: Custom Type Field */}
        {formData.type === 'other' && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customType">Custom Event Name <span className="text-destructive">*</span></Label>
            <Input
              id="customType"
              value={formData.customType}
              onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
              className="bg-background"
              placeholder="e.g., Doctor Appointment, Renewal"
              required
            />
          </div>
        )}

        {/* Row 2: Date and Timezone */}
        <div className="space-y-2">
          <Label htmlFor="birthdate">Event Date <span className="text-destructive">*</span></Label>
          <div className="flex flex-col gap-2">
            {formData.unknownYear ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select 
                    value={formData.birthdate.split('-')[1] || ""}
                    onValueChange={(m) => {
                      const y = formData.birthdate.split('-')[0] || "2000"
                      const d = formData.birthdate.split('-')[2] || "01"
                      setFormData({ ...formData, birthdate: `${y.length === 4 ? y : '2000'}-${m}-${d}` })
                    }}
                    required
                  >
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select 
                    value={formData.birthdate.split('-')[2] || ""}
                    onValueChange={(d) => {
                      const y = formData.birthdate.split('-')[0] || "2000"
                      const m = formData.birthdate.split('-')[1] || "01"
                      setFormData({ ...formData, birthdate: `${y.length === 4 ? y : '2000'}-${m}-${d}` })
                    }}
                    required
                  >
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <Input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                className="bg-background"
                required
              />
            )}
            <div className="flex items-center space-x-2 mt-1 ml-1">
              <input
                type="checkbox"
                id="unknownYear" 
                checked={formData.unknownYear} 
                onChange={(e) => setFormData({ ...formData, unknownYear: e.target.checked })} 
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
              />
              <Label htmlFor="unknownYear" className="text-sm font-normal cursor-pointer text-muted-foreground">
                Don't know year
              </Label>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
            <SelectTrigger id="timezone" className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Association and Date Met (Progressive Disclosure) */}
      {isPersonEvent && (
        <div className="space-y-6 pt-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">Additional Details</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="association">Association</Label>
              <Input
                id="association"
                value={formData.association}
                onChange={(e) => setFormData({ ...formData, association: e.target.value })}
                className="bg-background"
                placeholder="e.g. College, Work, Family"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetDate">Date Met</Label>
              <Input
                id="meetDate"
                type="date"
                value={formData.meetDate}
                onChange={(e) => setFormData({ ...formData, meetDate: e.target.value })}
                className="bg-background"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 justify-end pt-4 border-t border-border/50 mt-8">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : getSubmitLabel()}
        </Button>
      </div>
    </form>
  )
}
