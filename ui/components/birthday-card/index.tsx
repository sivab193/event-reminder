"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BirthdayForm } from "@/components/birthday-form"
import { Pencil, Trash2, Cake, Calendar, Globe } from "lucide-react"
import type { Birthday } from "@/lib/types"

interface BirthdayCardProps {
  birthday: Birthday
  onUpdate: (id: string, data: Omit<Birthday, "id" | "userId" | "createdAt">) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function BirthdayCard({ birthday, onUpdate, onDelete }: BirthdayCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleUpdate = async (data: Omit<Birthday, "id" | "userId" | "createdAt">) => {
    await onUpdate(birthday.id, data)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(birthday.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const getBirthdayMonth = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00")
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const formatMeetDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00")
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">{birthday.name}</h3>
              {birthday.association && (
                <div className="mt-1 text-sm text-muted-foreground">
                  <span>{birthday.association}</span>
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} aria-label="Edit birthday">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleDelete} disabled={isDeleting} aria-label="Delete birthday">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Cake className="h-4 w-4 text-primary" />
              <span className="font-medium capitalize">{birthday.type || "Birthday"}:</span>
              <span className="text-muted-foreground">{getBirthdayMonth(birthday.birthdate)} {birthday.unknownYear ? "" : birthday.birthdate.split('-')[0]}</span>
            </div>
            {birthday.meetDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">Date Met:</span>
                <span className="text-muted-foreground">{formatMeetDate(birthday.meetDate)}</span>
              </div>
            )}
            {birthday.timezone && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-medium">Timezone:</span>
                <span className="text-muted-foreground">{birthday.timezone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Birthday</DialogTitle>
          </DialogHeader>
          <BirthdayForm initialData={birthday} onSubmit={handleUpdate} onCancel={() => setIsEditing(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
