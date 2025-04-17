export function executeEveryXSeconds(callback:() => void, intervalInSeconds: number) {
    setInterval(callback, intervalInSeconds * 1000);
}

export function runAtSpecificTime(callback: () => void, time: Time): void {
    const now = new Date();
    const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, time.second);

    let delay = targetTime.getTime() - now.getTime();
    if (delay < 0) {
        const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, time.hour, time.minute, time.second);
        delay = nextDay.getTime() - now.getTime();
    }

    setTimeout(() => {
        callback();
        runAtSpecificTime(callback, time);
    }, delay);
}

export function runAtMultipleSpecificTimes(callback: () => void, times: Time[]): void {
    setInterval(() => {
        const now = new Date();
        const currentTime: Time = {
            hour: now.getHours(),
            minute: now.getMinutes(),
            second: now.getSeconds(),
        };

        if (times.some((time) => isTimeMatch(time, currentTime))) {
            callback();
        }
    }, 1000);
}

function isTimeMatch(timeA: Time, timeB: Time): boolean {
    return (
        timeA.hour === timeB.hour
        && timeA.minute === timeB.minute
        && timeA.second === timeB.second
    );
}