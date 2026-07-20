export const JOURNEY_PHOTOS_BUCKET = "ma5-member-journey";

export function journeyPhotoPath(userId: string, fileId: string) {
  return `journey/${userId}/${fileId}.jpg`;
}
