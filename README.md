# binter

Sunskriti portal for the metals and glass pilot. A notifier raises a collect. A vehicle accepts it, and Received lights with that name and number. An admin reads the week and the month.

The browser calls `/api`. Vercel forwards that to herback and strips `/api`, the same way [scrap](https://github.com/ancqit/scrap) does. herback serves the routes at `/binter`.

## Numbers

Set these on the herback service, beside `HERB_API_KEY` and `UPLOAD_TOKEN`. The portal does not store them.

| Name | Who enters it |
| --- | --- |
| `BINTER_NOTIFIER_TOKEN` | The person who raises a collect |
| `BINTER_RECEIVER_TOKEN` | The vehicle |
| `BINTER_ADMIN_TOKEN` | The sheet |

Use a different value for each. On Render they are the `sync: false` keys in herback's `render.yaml`.

## Buckets

Three buckets, from the metals and glass pilot:

- Ferrous metal
- Non-ferrous metal
- Glass

The place is Indoor, Yard, or Gate, plus a short label. There is no map. A photograph is required. A clip has to be ten seconds or shorter. Photographs, clips, and the request itself leave the bucket after 30 days. The vehicle's papers stay.

The vehicle can take several collects. Accept starts a timer and lights Received for the notifier, with the name and vehicle number. Collected clears that card from the vehicle's stack.

## Themes

Clock is the herbant sky with the rings at 0.3. Glass, brass, and kiln sit with the herbant themes.

## Deploy

Connect this repo on Vercel. `vercel.json` publishes `dist` and sends `/api` to `https://herback.onrender.com`.

herback has to be deployed with the three numbers first, or login stays shut. The R2 bucket CORS needs this site's origin on `PUT`, the same as herbant and scrap, or the photograph will not upload.

If the Vercel host is not `binter.vercel.app` or a `binter-….vercel.app` preview, add it to herback's `CORS_ORIGINS`.

```bash
npm install
npm start
```

The dev server is `http://127.0.0.1:5173`. It forwards `/api` to herback, as scrap's proxy does. Try the portal on Vercel.
