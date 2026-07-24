function addQueryParams(destination, params) {
    const isAbsolute = /^https?:\/\//i.test(destination);
    const url = new URL(destination, "http://local.invalid");
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}
module.exports = { addQueryParams };
