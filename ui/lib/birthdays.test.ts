import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addBirthday, updateBirthday, deleteBirthday, getBirthdays } from './birthdays'
import { addDoc, updateDoc, deleteDoc, getDocs, setDoc } from 'firebase/firestore'

vi.mock('./firebase', () => ({
  db: {}
}))

describe('birthdays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add a birthday and update stats', async () => {
    (addDoc as any).mockResolvedValueOnce({ id: 'bday1' })
    const id = await addBirthday({
      name: 'Test',
      association: 'T',
      birthdate: '2000-01-01',
      meetDate: '2020-01-01',
      timezone: 'UTC',
      userId: 'user1'
    })
    expect(id).toBe('bday1')
    expect(addDoc).toHaveBeenCalled()
    expect(updateDoc).toHaveBeenCalled() // stats update
  })

  it('should update a birthday', async () => {
    await updateBirthday('bday1', { name: 'New Name' })
    expect(updateDoc).toHaveBeenCalled()
  })

  it('should handle error when updating stats', async () => {
    (addDoc as any).mockResolvedValueOnce({ id: 'bday1' });
    (updateDoc as any).mockRejectedValueOnce(new Error('fail'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await addBirthday({
      name: 'Test',
      association: 'T',
      birthdate: '2000-01-01',
      meetDate: '2020-01-01',
      timezone: 'UTC',
      userId: 'user1'
    })
    expect(setDoc).toHaveBeenCalled() // retry logic
    consoleSpy.mockRestore()
  })

  it('should get birthdays for a user', async () => {
    (getDocs as any).mockResolvedValueOnce({
      docs: [
        { id: '1', data: () => ({ name: 'B1' }) },
        { id: '2', data: () => ({ name: 'B2' }) }
      ]
    })
    const bdays = await getBirthdays('user1')
    expect(bdays).toHaveLength(2)
    expect(bdays[0].id).toBe('1')
  })
})
