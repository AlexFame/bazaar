export function calculateQuality(listing) {
  let score = 0;
  const breakdown = [];

  // 1. Title (Max 10)
  if (listing.title && listing.title.length >= 10) {
    score += 10;
  } else {
    breakdown.push({ label: "Короткий заголовок", score: 0, max: 10 });
  }

  // 2. Description (Max 20)
  if (listing.description && listing.description.length >= 50) {
    score += 20;
  } else if (listing.description && listing.description.length >= 20) {
    score += 10;
    breakdown.push({ label: "Описание можно подробнее", score: 10, max: 20 });
  } else {
    breakdown.push({ label: "Слишком краткое описание", score: 0, max: 20 });
  }

  // 3. Photos (Max 40)
  // +20 for at least 1 photo
  // +20 for at least 3 photos
  const photoCount = listing.images ? listing.images.length : 0;
  if (photoCount >= 1) {
    score += 20;
    if (photoCount >= 3) {
      score += 20;
    } else {
      breakdown.push({ label: "Добавьте больше фото (3+)", score: 20, max: 40 });
    }
  } else {
    breakdown.push({ label: "Добавьте хотя бы одно фото", score: 0, max: 40 });
  }

  // 4. Details (Max 30)
  // Price (+10)
  if (listing.price && Number(listing.price) > 0) {
    score += 10;
  } else {
      breakdown.push({ label: "Укажите цену", score: 0, max: 10 });
  }

  // Location (+10)
  if (listing.location && listing.location.length > 0) {
    score += 10;
  } else {
      breakdown.push({ label: "Укажите местоположение", score: 0, max: 10 });
  }
  
  // Contacts (+10)
  if (listing.contacts && listing.contacts.length > 0) {
      score += 10;
  } else {
      breakdown.push({ label: "Укажите контакты", score: 0, max: 10 });
  }

  return { score, breakdown };
}

export function getQualityColor(score) {
  if (score < 40) return "bg-red-500";
  if (score < 75) return "bg-yellow-500";
  return "bg-green-500";
}

export function getQualityLabel(score) {
    if (score < 40) return "Слабое";
    if (score < 75) return "Хорошее";
    return "Отличное";
}
