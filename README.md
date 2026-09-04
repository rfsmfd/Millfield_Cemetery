# Millfield Cemetery — map and record

**https://rfsmfd.github.io/Millfield_Cemetery/**

A map of Millfield Baptist Church cemetery in Wakefield, Virginia, drawn from the church's own surveyed
geodatabase. Anyone can use it to find a grave or see which plots are available. The Cemetery Committee signs in
to record burials and sales, print a record of purchase, and keep the ledger.

Published, but **deliberately not listed in search engines** — the congregation is to be asked before the burial
names become findable by anyone searching for them. That is one `<meta name="robots">` line in `index.html`.

---

## What it shows

| | |
|---|---|
| **565 plots** | green *available* · amber *reserved* · blue *sold* · grey *occupied* |
| **113 burials** | name, birth, death, age, veteran service |
| **107 Find a Grave links** | tap through to the memorial |
| **57 family lots** | owner and size, named on the map once you zoom in |
| **69 plots over the property line** | outlined in broken red — they may not exist as drawn |

Plus surname and plot-number search, a filter for available plots, veterans, and your own position on the map.

## The four states of a plot

Following the committee's own rules:

- **available** — in no family lot, and for sale to church members
- **reserved** — bought and paid for, but the four corner markers are not yet set
- **sold** — markers set, so the ground has passed permanently into the owner's name
- **occupied** — a burial is recorded in it

Reserved to sold is exactly what the 120-day marker deadline is for. The status is worked out, never stored twice,
so the map cannot disagree with the marker record.

## Where the truth lives

**The drawing** — plots, lots, boundary, corner posts — came from the ArcGIS geodatabase and does not repeat.
`_tools/export_cemetery.py` writes it to `data/*.geojson`.

**The record** — who is buried where, what has sold, to whom, when — lives in Firestore, written from the app by
the committee. That is the part that changes forever, and keeping it needs no GIS software.

**ArcGIS is the archive**, not the live record. Export from the app and import when you want a printed map or new
survey work; nothing syncs automatically, so the app can never corrupt the geodatabase.

⚠ **Plot ids are the geodatabase's own OBJECTIDs.** `arcpy.Project` renumbers features from 1, and for a while the
record was keyed to that renumbering — which pointed at nothing in the geodatabase and put one sale on the wrong
ground. The export now stamps the real OBJECTID as `SRCOID` before anything is copied. Do not key anything to a
projected copy's OID.

## Public and private

Public, because it is carved on a stone or plain to see: the name, dates, veteran service, plot number, whether a
plot is spoken for, the owner's name, whether the markers and headstone are in place.

Committee only, refused by the server to anyone else: addresses, email, telephone, price, date of purchase, who
may be buried there, and which member recorded it. These live in `cemeteryPrivate`, which returns 403 to the public.

## Section letters — read before reinstating anything

A plot's full name is a section letter plus a number, "F20". It **cannot be derived from the map** — giving each
plot the nearest of the 21 `BLOCK` label points produced 108 duplicated labels across 263 of the 565 plots, and
passed its only available check while doing so. Chaining shared edges, banding the rotated grid and clustering by
spacing all failed too; the information is not in the geodatabase.

**The committee types the letter** on the sale form, and it is stored with the sale. The map shows the survey's
bare lot number and claims nothing more.

## The property line

The church has a survey of its property line. It has never had one tying the cemetery's plots to that line — the
committee chose to prove each plot as it is sold rather than pay for a survey. So 69 plots are drawn at or past the
line, are marked in red, and say so on their own sheet and on the record of purchase. A plot is confirmed when the
purchaser sets the four corner markers.

## The deadlines, watched automatically

`_tools/marker-reminder.gs` runs in Google Apps Script every morning and emails the committee — and the purchaser
or family — when either clock runs out:

- **120 days** from the letter for the purchaser's four granite corner markers
- **180 days** from a burial for the family's headstone

It reads both halves of the record through its own service account, whose credentials live in that project's Script
Properties, never in the code.

## Keeping it

**Export the whole record** (committee panel) writes CSV and GeoJSON of everything. Excel reads one, any mapping
program reads the other, and neither needs an account or a subscription. That file is what survives Google, this
app, and any one person. Keep the newest with the church papers.

## Running it locally

`Start Cemetery Map.bat` serves it on port 5185 and prints the address for a phone on the same wi-fi. Offline
support needs `https`, so the published site is the one to use in the field.

**Bump `BUILD` in both `index.html` and `sw.js` on every change — including when only `data/` changes.** The build
number names the caches, and a stale copy will otherwise survive a refresh.
