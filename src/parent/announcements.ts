export type Announcement = { id: string; child_id: string; batch_name: string; body: string; created_at: string };
export const announcementsForChild = (rows: Announcement[], childId: string) => rows.filter(r => r.child_id === childId).sort((a, b) => b.created_at.localeCompare(a.created_at));
