"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { addBirthday } from "@/lib/birthdays"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, UploadCloud } from "lucide-react"
import JSZip from "jszip"
// @ts-ignore
import ICAL from "ical.js"

export function ImportBirthdays({ onImportComplete }: { onImportComplete: () => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const processICSData = async (icsData: string) => {
    try {
      const jcalData = ICAL.parse(icsData)
      const comp = new ICAL.Component(jcalData)
      const vevents = comp.getAllSubcomponents("vevent")
      
      let importedCount = 0

      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent)
        const summary = event.summary
        const startDate = event.startDate
        
        // Simple heuristic: If it contains "Birthday" or "bday" in summary
        // Or we just import all all-day events? Let's just import all events as birthdays.
        if (summary && startDate) {
          const name = summary.replace(/\s*(Birthday|Bday|'s birthday)\s*/gi, "").trim() || "Unknown"
          
          // format to YYYY-MM-DD
          const year = startDate.year.toString()
          const month = startDate.month.toString().padStart(2, "0")
          const day = startDate.day.toString().padStart(2, "0")
          const birthdate = `${year}-${month}-${day}`
          
          // Current timezone or default
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          
          if (user) {
            await addBirthday({
              userId: user.uid,
              name,
              association: "Imported Contact",
              birthdate,
              meetDate: new Date().toISOString().split("T")[0],
              timezone
            })
            importedCount++
          }
        }
      }
      return importedCount
    } catch (error) {
      console.error("Error parsing ICS data:", error)
      return 0
    }
  }

  const processVCFData = async (vcfData: string) => {
    try {
      // Split by BEGIN:VCARD and filter out empty strings
      const cards = vcfData.split(/BEGIN:VCARD/i).filter(c => c.trim().length > 0)
      let importedCount = 0

      for (const card of cards) {
        // Simple regex-based parsing for FN (Full Name) and BDAY (Birthday)
        const nameMatch = card.match(/^FN:(.*)$/m)
        const bdayMatch = card.match(/^BDAY:(.*)$/m)

        if (nameMatch && bdayMatch && user) {
          const name = nameMatch[1].trim()
          let rawBday = bdayMatch[1].trim()
          
          // VCF BDAY can be YYYYMMDD or YYYY-MM-DD or --MMDD
          // Normalize to YYYY-MM-DD
          let formattedBday = ""
          
          if (/^\d{8}$/.test(rawBday)) {
            // YYYYMMDD
            formattedBday = `${rawBday.slice(0, 4)}-${rawBday.slice(4, 6)}-${rawBday.slice(6, 8)}`
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawBday)) {
            // YYYY-MM-DD
            formattedBday = rawBday
          } else if (/^--\d{4}$/.test(rawBday)) {
            // --MMDD (Common in iPhone exports when year is hidden)
            // Use current year as placeholder
            const currentYear = new Date().getFullYear()
            formattedBday = `${currentYear}-${rawBday.slice(2, 4)}-${rawBday.slice(4, 6)}`
          }

          if (formattedBday) {
            await addBirthday({
              userId: user.uid,
              name,
              association: "Imported Contact (VCF)",
              birthdate: formattedBday,
              meetDate: new Date().toISOString().split("T")[0],
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
            })
            importedCount++
          }
        }
      }
      return importedCount
    } catch (error) {
      console.error("Error parsing VCF data:", error)
      return 0
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    let totalImported = 0

    try {
      if (file.name.endsWith(".zip")) {
        const zip = new JSZip()
        const unzipped = await zip.loadAsync(file)
        
        for (const [filename, zipEntry] of Object.entries(unzipped.files)) {
          if (!zipEntry.dir && filename.endsWith(".ics")) {
            const icsData = await zipEntry.async("text")
            totalImported += await processICSData(icsData)
          } else if (!zipEntry.dir && filename.endsWith(".vcf")) {
            const vcfData = await zipEntry.async("text")
            totalImported += await processVCFData(vcfData)
          }
        }
      } else if (file.name.endsWith(".ics")) {
        const text = await file.text()
        totalImported = await processICSData(text)
      } else if (file.name.endsWith(".vcf")) {
        const text = await file.text()
        totalImported = await processVCFData(text)
      } else {
        throw new Error("Invalid file type. Please upload .ics, .vcf, or .zip")
      }

      toast({
        title: "Import Successful",
        description: `Successfully imported ${totalImported} birthdays.`,
      })
      onImportComplete()
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to process the file.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ""
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/50 rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="p-3 bg-primary/10 rounded-full">
          <UploadCloud className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-medium">Bulk Import Birthdays</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload an Apple/Google Calendar .ics file, a .vcf contact file, or a .zip file.
          </p>
        </div>
        <div className="relative">
          <Input
            type="file"
            accept=".ics,.vcf,.zip"
            onChange={handleFileUpload}
            disabled={loading}
            aria-label="Select File"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button disabled={loading} variant="outline">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Select File (.ics / .vcf / .zip)
          </Button>
        </div>
      </div>
    </div>
  )
}
