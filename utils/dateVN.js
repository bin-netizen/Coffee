// utils/dateVN.js
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const VN_TZ = 'Asia/Ho_Chi_Minh';

function vnDateRange(startDateStr, endDateStr) {
  return {
    start: dayjs.tz(startDateStr, VN_TZ).startOf('day').utc().toDate(),
    end: dayjs.tz(endDateStr, VN_TZ).endOf('day').utc().toDate(),
  };
}

module.exports = { dayjs, VN_TZ, vnDateRange };