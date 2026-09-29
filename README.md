# TRC High Performance website

Static site for Texas Rowing Center – High Performance. Plain HTML, CSS, and JavaScript with no build step.

## Structure

```
index.html        All pages (Home, About, The Team, Support, Media), switched with #/ routes
css/site.css      Styles and animations
js/site.js        Routing, page transition, scroll effects, team + gallery data
js/scull.js       Animated rowing scull
assets/           Hero photo (3 sizes), logo, favicons
favicon.ico
vercel.json       Vercel static hosting config
```

## Editing content

- **Athletes and gallery photos:** edit the `TEAM` and `GALLERY` lists at the top of `js/site.js`.
- **Page header and coach photos:** put an `<img src="...">` inside the matching `.slot` element in `index.html`.
- **Donation links:** search `paypal.com` in `index.html`.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Import the GitHub repo in Vercel. No framework, build command, or environment variables are needed; Vercel serves the repo root as-is (settings are in `vercel.json`).
