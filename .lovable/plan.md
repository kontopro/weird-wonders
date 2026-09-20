# Admin dashboard «FACTάκι»

## Στόχος
Προσθήκη ολοκληρωμένου, responsive frontend prototype για τους συντάκτες, χωρίς authentication, backend, database, integrations ή πραγματικό upload. Το δημόσιο site παραμένει αμετάβλητο.

## Σελίδες
- `/admin`: επισκόπηση με χαιρετισμό, στατιστικά, πρόσφατα και δημοφιλή άρθρα, γρήγορες ενέργειες και editorial reminder.
- `/admin/articles`: αναζήτηση, φίλτρα, ταξινόμηση, desktop table, mobile cards, actions menu και τοπική επιβεβαίωση διαγραφής.
- `/admin/articles/new`: πλήρες prototype editor νέου άρθρου.
- `/admin/articles/$slug/edit`: επαναχρησιμοποίηση του ίδιου editor με προσυμπληρωμένα mock στοιχεία.
- `/admin/categories` και `/admin/profile`: ολοκληρωμένες UI οθόνες ώστε όλα τα στοιχεία του sidebar να οδηγούν σε πραγματικές σελίδες.

## Κοινό admin περιβάλλον
- Ξεχωριστό `AdminLayout` με σταθερό sidebar στο desktop και πτυσσόμενο menu σε tablet/mobile.
- Λογότυπο FACTάκι, προφίλ Μαρίας, «Προβολή site» και placeholder αποσύνδεσης.
- Admin-only οπτικά styles που αξιοποιούν την υπάρχουσα off-white, navy, κίτρινη και κοραλλί παλέτα.
- Καθαρή λειτουργική sans-serif τυπογραφία, με serif μόνο στους βασικούς editorial τίτλους.

## Επαναχρησιμοποιήσιμα στοιχεία
- `AdminSidebar`, `StatsCard`, `ArticlesTable`, `ArticleStatusBadge`.
- `ArticleEditor`, `ImageUploadPlaceholder`, `PublishPanel`, `SeoPanel`, `ConfirmDialog`.
- Κοινά mock άρθρα και admin types για συνεπή δεδομένα σε όλες τις οθόνες.

## Αλληλεπιδράσεις μόνο στη συσκευή
- Αναζήτηση, φίλτρα, ταξινόμηση, actions menu, τοπική αφαίρεση άρθρου και empty state.
- Editor με τίτλο, αυτόματο slug, counters, formatting toolbar και mock autosave.
- Προσωρινό image preview με `URL.createObjectURL`, alt text και αφαίρεση εικόνας.
- Tags, κατηγορία, συντάκτης, ημερομηνία και τρία toggles.
- Mock save toast, confirmation πριν τη δημοσίευση και loading skeleton preview.
- Καμία κλήση σε server, storage ή εξωτερικό API.

## Έλεγχος
- Έλεγχος όλων των admin routes σε desktop και mobile.
- Έλεγχος navigation, filters, delete confirmation, editor controls, image preview, save/publish feedback και μηδενικού οριζόντιου scroll.
- Επιβεβαίωση ότι οι public routes και η υπάρχουσα εμφάνισή τους δεν άλλαξαν.
