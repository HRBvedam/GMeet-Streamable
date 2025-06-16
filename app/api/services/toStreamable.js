import request from "request";

export class ToStreamable {
  constructor(opts = {}) {
    this.opts = opts;
    this.shortcode = null;
  }

  upload(cb = () => {}) {
    const { file, auth, params = [] } = this.opts;

    if (!file) return cb(new Error("No file specified"));
    if (!auth) return cb(new Error("No auth specified"));

    const paramString = params.length > 0 ? `?${params.join("&")}` : "";

    const req = request(
      {
        method: "POST",
        url: `https://api.streamable.com/upload${paramString}`,
        formData: { file },
        json: true,
        auth,
      },
      (err, res, body) => {
        if (err) return cb(err);
        if (!body || !body.shortcode) {
          return cb(new Error("Invalid response from Streamable"));
        }

        const { shortcode } = body;
        this.shortcode = shortcode;
        return cb(null, body);
      }
    );

    return req;
  }

  status(cb = () => {}) {
    const { auth } = this.opts;
    const shortcode = this.shortcode;

    if (!shortcode) return cb(new Error("No shortcode, upload file first"));

    const req = request(
      {
        method: "GET",
        url: `https://api.streamable.com/videos/${shortcode}`,
        json: true,
        auth,
      },
      (err, res, body) => cb(err, body)
    );

    return req;
  }
}