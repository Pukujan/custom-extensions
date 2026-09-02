(() => {
  const TIME_ZONE = "America/New_York";
  const START_MINUTE = 11 * 60;
  const END_MINUTE = 12 * 60;

  function minuteOfDay(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? -1);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? -1);
    return hour * 60 + minute;
  }

  function allowedNow() {
    const minute = minuteOfDay(new Date());
    return minute >= START_MINUTE && minute < END_MINUTE;
  }

  function enforce() {
    if (!allowedNow()) {
      const blocked = chrome.runtime.getURL("blocked.html");
      if (location.href !== blocked) location.replace(blocked);
    }
  }

  enforce();
  setInterval(enforce, 1000);
})();
