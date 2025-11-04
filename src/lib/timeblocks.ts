import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ja } from "date-fns/locale";

// 曜日ごとの学習可能時間帯を定義（時:分）
// 0 = 日曜日, 1 = 月曜日, ..., 6 = 土曜日
// 学習可能時間帯 = ホワイト、学習困難な時間帯 = グレー
const AVAILABLE_HOURS: { [key: number]: { start: number; end: number }[] } = {
  0: [{ start: 7, end: 8 }, { start: 21, end: 22 }],  // 日: 7時台、21時台（学習可能 = ホワイト）、20時台はグレー、他はグレー
  1: [{ start: 7, end: 8 }, { start: 16, end: 18 }, { start: 20, end: 21 }, { start: 21, end: 23 }],  // 月: 7時台、16-17時台、20時台、21-22時台（学習可能 = ホワイト）、6時台と18-19時台はグレー
  2: [{ start: 7, end: 8 }, { start: 22, end: 23 }],  // 火: 7時台、22時台（学習可能 = ホワイト）、他はグレー
  3: [{ start: 7, end: 8 }, { start: 14, end: 18 }, { start: 20, end: 21 }, { start: 21, end: 23 }],  // 水: 7時台、14-17時台、20時台、21-22時台（学習可能 = ホワイト）、他はグレー
  4: [{ start: 7, end: 8 }, { start: 22, end: 23 }],  // 木: 7時台、22時台（学習可能 = ホワイト）、他はグレー
  5: [{ start: 7, end: 8 }, { start: 16, end: 18 }, { start: 20, end: 21 }, { start: 21, end: 23 }],  // 金: 7時台、16-17時台、20時台、21-22時台（学習可能 = ホワイト）、他はグレー
  6: [{ start: 7, end: 8 }, { start: 9, end: 12 }, { start: 21, end: 22 }], // 土: 7時台、9-11時台、21時台（学習可能 = ホワイト）、20時台はグレー、他はグレー
};

export function generateTimeBlocks(date: Date) {
  const dayOfWeek = date.getDay();
  const availableHourRanges = AVAILABLE_HOURS[dayOfWeek];
  const blocks: any[] = [];
  
  // カレンダーの表示範囲は6:00-23:00なので、その範囲でグレーアウトを設定
  const calendarStartHour = 6;
  const calendarEndHour = 23;
  
  // 学習可能時間帯（ホワイト）をSetで管理
  const availableHoursSet = new Set<number>();
  availableHourRanges.forEach(range => {
    for (let hour = range.start; hour < range.end; hour++) {
      availableHoursSet.add(hour);
    }
  });
  
  // 月曜日について、6時台と18-19時台は学習困難な時間帯（学習可能時間から除外）
  if (dayOfWeek === 1) { // 月曜日
    availableHoursSet.delete(6);
    for (let hour = 18; hour < 20; hour++) {
      availableHoursSet.delete(hour);
    }
  }
  
  // 6時から23時まで、学習困難な時間帯（グレー）を設定
  let currentHour = calendarStartHour;
  while (currentHour < calendarEndHour) {
    // 現在の時間が学習可能時間帯かどうか確認
    if (availableHoursSet.has(currentHour)) {
      // 学習可能時間帯なのでスキップ
      currentHour++;
      continue;
    }
    
    // 学習困難な時間帯の開始点を見つける
    const grayStart = currentHour;
    
    // 学習困難な時間帯の終了点を見つける（次の学習可能時間帯の開始まで）
    let grayEnd = currentHour + 1;
    while (grayEnd < calendarEndHour && !availableHoursSet.has(grayEnd)) {
      grayEnd++;
    }
    
    // グレーの時間帯を追加（学習困難な時間帯）
    blocks.push({
      start: format(date, "yyyy-MM-dd") + `T${String(grayStart).padStart(2, '0')}:00:00`,
      end: format(date, "yyyy-MM-dd") + `T${String(grayEnd).padStart(2, '0')}:00:00`,
      display: "background",
      backgroundColor: "rgba(107, 114, 128, 0.4)", // グレー（学習困難な時間帯）- 濃いめに設定
      borderColor: "rgba(107, 114, 128, 0.5)",
      classNames: ["fc-bg-gray"],
    });
    
    currentHour = grayEnd;
  }
  
  return blocks;
}

export function generateWeekTimeBlocks(startDate: Date) {
  const timeBlocks: any[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, i);
    timeBlocks.push(...generateTimeBlocks(date));
  }
  
  return timeBlocks;
}

export function formatDateJapanese(date: Date): string {
  return format(date, "M月d日(E)", { locale: ja });
}

export function formatTimeJapanese(date: Date): string {
  return format(date, "HH:mm");
}

// 一週間の学習可能時間を計算（分単位）
export function calculateWeeklyAvailableMinutes(startDate: Date): number {
  let totalMinutes = 0;
  
  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, i);
    const dayOfWeek = date.getDay();
    const availableHourRanges = AVAILABLE_HOURS[dayOfWeek];
    availableHourRanges.forEach(range => {
      const hours = range.end - range.start;
      totalMinutes += hours * 60;
    });
  }
  
  return totalMinutes;
}

// 曜日ごとの学習可能時間を取得（分単位）
export function getAvailableHours(): { [key: number]: { start: number; end: number } } {
  return AVAILABLE_HOURS;
}