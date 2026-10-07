export const FIXTURE_DATA = {
  ok: true,
  generatedAt: '2026-10-07T08:42:00.000Z',
  config: {
    TripName: 'Europe 2026', StartDate: '2026-10-16', EndDate: '2026-10-27', Timezone: 'Europe/Prague',
    EmergencyCzechia: '112 · European emergency number', EmergencyAustria: '112 · European emergency number',
    TravelNotes: 'Keep passports and rail tickets available offline. Validate local transport passes before the first ride.'
  },
  trip: [
    { Day: 1, Date: '2026-10-16', City: 'Prague', Country: 'Czechia', CountryCode: 'CZ', Summary: 'Old Town · Charles Bridge', Note: 'Arrival day' },
    { Day: 2, Date: '2026-10-17', City: 'Prague', Country: 'Czechia', CountryCode: 'CZ', Summary: 'Prague Castle · Malá Strana', Note: '' },
    { Day: 4, Date: '2026-10-19', City: 'Český Krumlov', Country: 'Czechia', CountryCode: 'CZ', Summary: 'Prague → Český Krumlov', Note: 'Travel light' },
    { Day: 5, Date: '2026-10-20', City: 'Salzburg', Country: 'Austria', CountryCode: 'AT', Summary: 'Old Town · Mirabell Gardens', Note: '' },
    { Day: 7, Date: '2026-10-22', City: 'Hallstatt', Country: 'Austria', CountryCode: 'AT', Summary: 'Lake crossing · Village walk', Note: '' },
    { Day: 8, Date: '2026-10-23', City: 'Vienna', Country: 'Austria', CountryCode: 'AT', Summary: 'Hallstatt → Salzburg → Vienna', Note: 'Collect luggage in Salzburg' }
  ],
  itinerary: [
    { Day: 1, Date: '2026-10-16', Type: 'Flight', Time: '10:00', EndTime: '', Title: 'Arrive at PRG', Subtitle: 'Václav Havel Airport Prague', Link: '', Address: 'Aviatická, 161 00 Praha 6, Czechia', Note: '辦理入境並領取行李。' },
    { Day: 1, Date: '2026-10-16', Type: 'Transport', Time: '11:00', EndTime: '11:40', Title: 'Airport Express', Subtitle: 'PRG → Praha hlavní nádraží', Link: 'https://www.dpp.cz/en', Address: '', Note: '有大型行李空間。' },
    { Day: 1, Date: '2026-10-16', Type: 'Hotel', Time: '12:15', EndTime: '', Title: 'Clarion Hotel Prague Old Town', Subtitle: 'Leave luggage', Link: '', Address: 'Hradební 768/9, Prague', Note: '抵達後先寄放行李。' },
    { Day: 1, Date: '2026-10-16', Type: 'Attraction', Time: '12:45', EndTime: '', Title: 'Powder Tower', Subtitle: '火藥塔', Link: 'https://www.prague.eu/en/objects/places/180/powder-gate-tower', Address: 'nám. Republiky 5, Prague', Note: '只看外觀，不登塔。' },
    { Day: 1, Date: '2026-10-16', Type: 'Food', Time: '14:15', EndTime: '15:30', Title: 'U Pivrnce', Subtitle: 'Lunch', Link: '', Address: 'Maiselova 3, Prague', Note: '用餐後往 Klementinum 方向。' },
    { Day: 1, Date: '2026-10-16', Type: 'Cafe', Time: '15:45', EndTime: '16:45', Title: 'Café Louvre', Subtitle: '百年咖啡館', Link: 'https://www.cafelouvre.cz/en', Address: 'Národní 22, Prague', Note: '今天唯一稍微往南繞的地點。' },
    { Day: 1, Date: '2026-10-16', Type: 'Attraction', Time: '17:20', EndTime: '18:20', Title: 'Charles Bridge', Subtitle: '查理大橋', Link: '', Address: 'Karlův most, Prague', Note: '接近黃昏過橋。' },
    { Day: 2, Date: '2026-10-17', Type: 'Attraction', Time: '09:00', EndTime: '12:00', Title: 'Prague Castle', Subtitle: '布拉格城堡', Link: 'https://www.hrad.cz/en', Address: 'Hradčany, 119 08 Prague', Note: '早上先前往，避開中午人潮。' },
    { Day: 2, Date: '2026-10-17', Type: 'Activity', Time: '14:00', EndTime: '', Title: 'Malá Strana Walk', Subtitle: '小城區散步', Link: '', Address: 'Malá Strana, Prague', Note: '' },
    { Day: 4, Date: '2026-10-19', Type: 'Bus', Time: '10:00', EndTime: '', Title: 'RegioJet Bus', Subtitle: 'Prague → Český Krumlov', Link: '', Address: '', Note: '提前抵達站牌。' },
    { Day: 5, Date: '2026-10-20', Type: 'Attraction', Time: '10:00', EndTime: '', Title: 'Mirabell Gardens', Subtitle: '米拉貝爾花園', Link: '', Address: 'Mirabellplatz 4, Salzburg', Note: '' },
    { Day: 7, Date: '2026-10-22', Type: 'Transport', Time: '08:15', EndTime: '', Title: 'Train to Hallstatt', Subtitle: 'Salzburg → Hallstatt', Link: '', Address: '', Note: '輕便行李前往。' },
    { Day: 8, Date: '2026-10-23', Type: 'Train', Time: '16:11', EndTime: '', Title: 'IC 743', Subtitle: 'Salzburg → Vienna', Link: '', Address: '', Note: '15:50 前抵達月台。' }
  ],
  bookings: [
    { Date: '2026-10-16', Time: '', Type: 'Hotel', Title: 'Clarion Hotel Prague Old Town', BookingInfo: '10/16–10/19 · 3 Nights', Link: 'https://example.com/booking/prague', Note: 'Breakfast included', Address: 'Hradební 768/9, Prague' },
    { Date: '2026-10-18', Time: '13:00', Type: 'Attraction', Title: 'Klementinum', BookingInfo: 'English Guided Tour', Link: 'https://example.com/ticket/klementinum', Note: '提前 10–15 分鐘抵達', Address: 'Mariánské nám. 5, Prague' },
    { Date: '2026-10-19', Time: '10:00', Type: 'Bus', Title: 'RegioJet', BookingInfo: 'Prague → Český Krumlov', Link: 'https://example.com/ticket/bus', Note: '2 seats', Address: '' },
    { Date: '2026-10-20', Time: '', Type: 'Hotel', Title: 'H+ Hotel Salzburg', BookingInfo: '10/20–10/22', Link: 'https://example.com/booking/salzburg', Note: 'Near Salzburg Hbf', Address: 'Südtiroler Platz 13, Salzburg' },
    { Date: '2026-10-23', Time: '16:11', Type: 'Train', Title: 'IC 743', BookingInfo: 'Salzburg → Vienna · Seat Reserved', Link: 'https://example.com/ticket/obb', Note: 'Collect luggage before departure', Address: 'Salzburg Hauptbahnhof' },
    { Date: '2026-10-23', Time: '', Type: 'Hotel', Title: 'Vienna Hotel', BookingInfo: 'Near Wien Hbf', Link: 'https://example.com/booking/vienna', Note: '', Address: 'Wien Hauptbahnhof, Vienna' }
  ],
  checklist: [
    { Category: 'Documents', Item: 'Passport', Note: '確認效期與影本' },
    { Category: 'Documents', Item: 'Travel insurance', Note: '保單離線備份' },
    { Category: 'Tickets', Item: 'ÖBB tickets', Note: '下載至手機' },
    { Category: 'Tickets', Item: 'Klementinum booking', Note: 'English Guided Tour' },
    { Category: 'Packing', Item: 'EU power adapter', Note: '' },
    { Category: 'Packing', Item: 'Light rain jacket', Note: 'October weather' }
  ]
};
