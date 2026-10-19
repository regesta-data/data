# Regesta data

One JSON file per EU procedure, as described by the [Regesta procedure schema v0.1](https://github.com/regesta-data/regesta/tree/main/schema/v0.1). Each daily run of Regesta commits the changes of that day; the commit history is the change log of every procedure.

> **Status: empty.** Files are written from module M3 on. Until then this repository contains only licences and checks.

## Licence

This dataset (“Regesta graph”) is an adaptation of European Union documents and data. Berth licenses its contributions (selection, arrangement, linking, derived edges) under Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/. Source data keep their own licence, recorded per node and edge in `sources[].license`:

- European Parliament: CC BY 4.0 or CC0 1.0 (Bureau decision of 16.12.2024, OJ C/2025/341).
- European Commission and Publications Office: Decision 2011/833/EU with Decision C(2019) 1655 (CC BY 4.0); EUR-Lex metadata CC0 1.0.
- Council of the European Union: Decision (EU) 2017/1842.

Changes: Berth has normalised and linked the data and added derived links, marked `provenance.status: derived`.

Voting data are not part of this repository. They are a separate database under the Open Database License 1.0 in the bulk export at regesta.io.

Not an official publication. Full text and liability: [`LICENSE-DATA`](LICENSE-DATA).

<details>
<summary>Lizenz (Deutsch)</summary>

Dieser Datensatz („Regesta-Graph“) ist eine Bearbeitung von Dokumenten und Daten der Europäischen Union. Berth stellt seine Beiträge (Auswahl, Anordnung, Verknüpfung, abgeleitete Kanten) unter Creative Commons Namensnennung 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/. Die Quelldaten behalten ihre Lizenz; sie steht je Knoten und Kante im Feld `sources[].license`:

- Europäisches Parlament: CC BY 4.0 bzw. CC0 1.0 (Präsidiumsbeschluss vom 16.12.2024, ABl. C/2025/341).
- Europäische Kommission und Amt für Veröffentlichungen: Beschluss 2011/833/EU mit Beschluss C(2019) 1655 (CC BY 4.0); EUR-Lex-Metadaten CC0 1.0.
- Rat der Europäischen Union: Beschluss (EU) 2017/1842.

Änderungen: Berth hat die Daten vereinheitlicht, verknüpft und um abgeleitete Verbindungen ergänzt; diese sind mit `provenance.status: derived` gekennzeichnet.

Die Abstimmungsdaten sind nicht Teil dieses Repositorys. Sie liegen als eigene Datenbank unter der Open Database License 1.0 im Bulk-Export auf regesta.io.

Keine amtliche Veröffentlichung. Volltext und Haftung: [`LICENSE-DATA`](LICENSE-DATA).

</details>

## No personal data here

This repository contains no personal data: no names, no EP person identifiers, no political group, no party, no votes. Roles in a procedure (rapporteur with group) are only a link, for example `https://regesta.io/v1/procedures/2025-0102-cod/people`; the data behind it are served from Regesta's servers in the EU. A check in CI fails on any personal-data field.

## Layout

    procedures/cod/2025/2025-0102-cod.json

## Liability

Regesta is an independent service by Berth. It is not an official publication and is not operated, endorsed or reviewed by any institution of the European Union. The institutions' original documents prevail; every entry links to them.

The European Commission and the Council of the European Union are not liable for any consequence stemming from the reuse of their documents in Regesta. The European Parliament is not responsible for this service.

## Contributing

Corrections to data are made in the sources or in Regesta's rules, not in these files. Pull requests need the contributor licence agreement in [`CLA.md`](CLA.md).
