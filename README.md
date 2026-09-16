# Millfield Cemetery — map and record

**https://rfsmfd.github.io/Millfield_Cemetery/**

A map of Millfield Baptist Church cemetery in Wakefield, Virginia, drawn from the church's own surveyed
geodatabase. Anyone can use it to find a grave or see which plots are available. The Cemetery Committee signs in
to record burials and sales, print a record of purchase, and keep the ledger.

Published, and the church has approved a link from its website and a search-engine listing. **Not listed yet**:
one `<meta name="robots">` line in `index.html` still says noindex, and comes out when the pre-release findings are
settled. Reviews and findings live with the committee papers, not in this repository.

---

## What it shows

| | |
|---|---|
| **564 plots** | green *available* · amber *reserved* · blue *sold* · grey *occupied*; 256 are available to sell |
| **113 burials** | name, birth, death, age, veteran service, and the plot each lies in |
| **107 Find a Grave links** | tap through to the memorial |
| **57 family lots** | owner and size, named on the map once you zoom in |
| **69 plots over the property line** | outlined in broken red — they may not exist as drawn |

Plus search by any words of a name, by an owner, or by a plot such as F20; filters for available plots and veterans; and your own position on the map.

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

Public, because it is carved on a stone or plain to see: the name, dates, veteran service, plot number, the Find a
Grave link, whether a plot is spoken for, the owner's name, and a family lot's size.

Committee only, refused by the server to anyone else: addresses, email, telephone, price, date of purchase, who may
be buried there, which member recorded it, the burial note and both deadline clocks (`cemeteryPrivate`). The
**signed records of purchase** (`cemeterySigned`), each member’s **saved signature** (`cemeterySignatures`, readable
by its owner alone) and the **committee roll** are refused to everyone else as well.

## Row letters

A plot is named by its row letter and its number, "F20". Each row is one plot wide, its letter stands just
before plot 1, and the numbers count up along the row. The letters are a real ArcGIS field - `BLOCK.BLOCKLET` -
but they sit on 21 label points, one per row, not on the plots.

`_tools/assign-rows.js` joins each plot to its row by walking the row from its letter, and **refuses to write**
unless the evidence agrees: every family lot that records its plot names must come out exactly (the Cornwell lot
M20-M27, the Cutright sale F20-F21), all 21 letters must be used once with no name repeated, and no row may cross
an aisle in the ArcGIS Lines layer. Run it after every export.

An earlier attempt gave each plot the nearest label point and was wrong on 263 of 565 plots while passing its only
check. This is not that. What the committee types on the sale form still overrides the letter.

## Signing a record of purchase

The committee prints, signs and sends the record of purchase without leaving the app: the recorder's saved
signature (or one drawn on screen) goes on both pages, the app builds the PDF, keeps it with the sale and hands it
to the phone's own share sheet. A copy signed elsewhere - a PDF or a photo of the signed paper - can be attached to
the sale too. Signed copies are committee-only, and come out with **Export the whole record**.

## The property line

The church has a survey of its property line. It has never had one tying the cemetery's plots to that line — the
committee chose to prove each plot as it is sold rather than pay for a survey. So 69 plots are drawn at or past the
line, are marked in red, and say so on their own sheet and on the record of purchase. A plot is confirmed when the
purchaser sets the four corner markers.

## The deadlines, watched automatically

`_tools/marker-reminder.gs` runs in Google Apps Script every morning and emails the committee — and the purchaser
or family — when either clock runs out:

- **120 days** from the date of purchase for the purchaser's four granite corner markers
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
