export function calculateQuality(listing) {
  let score = 0;
  const breakdown = [];

  // 1. Title (Max 20)
  // Fair rule: If it breaks the minimum length (3), it's valid.
  if (listing.title && listing.title.length >= 3) {
    score += 20;
  } else {
    breakdown.push({ label: "Слишком короткий заголовок", score: 0, max: 20 });
  }

  // 2. Description (Max 20)
  // Fair rule: A short sentence is enough ("Продаю, потому что переехал").
  if (listing.description && listing.description.length >= 10) {
    score += 20;
  } else {
    breakdown.push({ label: "Добавьте хотя бы минимальное описание", score: 0, max: 20 });
  }

  // 3. Photos (Max 40)
  // Visuals are crucial, but 1 is a good start. 3 is excellent.
  const photoCount = listing.images ? listing.images.length : 0;
  if (photoCount >= 3) {
    score += 40;
  } else if (photoCount >= 1) {
    score += 20;
    breakdown.push({ label: "Добавьте больше фото (3+)", score: 20, max: 40 });
  } else {
    breakdown.push({ label: "Добавьте хотя бы одно фото", score: 0, max: 40 });
  }

  // 4. Details (Max 20)
  // Price (10)
  if (listing.price && Number(listing.price) > 0) {
    score += 10;
  } else {
    breakdown.push({ label: "Укажите цену", score: 0, max: 10 });
  }

  // Location (5)
  if (listing.location && listing.location.length > 0) {
    score += 5;
  } else {
    breakdown.push({ label: "Укажите местоположение", score: 0, max: 5 });
  }
  
  // Contacts (5)
  if (listing.contacts && listing.contacts.length > 0) {
      score += 5;
  } else {
      breakdown.push({ label: "Укажите контакты", score: 0, max: 5 });
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
