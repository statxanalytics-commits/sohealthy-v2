-- FAQ table + public read policy + seed content (Albanian). Image-free.
-- Generated for the in-app Ndihmë / Pyetjet e Shpeshta feature.

create table if not exists public.faq (
  id          uuid primary key default gen_random_uuid(),
  category    text        not null,
  question    text        not null,
  answer      text        not null,
  sort_order  integer     not null default 0,
  is_published boolean    not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.faq enable row level security;

-- Public read of PUBLISHED rows. anon is required so the FAQ loads on the
-- pre-login (login / signup) screens; authenticated covers logged-in users.
drop policy if exists "faq_public_read" on public.faq;
create policy "faq_public_read"
  on public.faq for select
  to anon, authenticated
  using (is_published = true);

-- keep updated_at fresh on edits
create or replace function public.faq_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists faq_set_updated_at on public.faq;
create trigger faq_set_updated_at
  before update on public.faq
  for each row execute function public.faq_set_updated_at();

-- Seed (safe to edit later directly in the Supabase table editor)
insert into public.faq (category, question, answer, sort_order) values
  ('Llogaria dhe regjistrimi', 'Si krijoj një llogari?', 'Në ekranin e parë zgjidh "Regjistrohu falas", pastaj plotëso Emrin, Username-in, Email-in dhe Fjalëkalimin. Prano Kushtet e Shërbimit dhe shtyp "Krijo llogarinë". Regjistrimi është falas dhe pa kartë krediti.', 1),
  ('Llogaria dhe regjistrimi', 'A më duhet të paguaj për të përdorur aplikacionin?', 'Jo. Llogaria dhe të gjitha mjetet falas (quiz-i, kalkulatorët, Challenge 30-ditor, plani i dietës falas) janë pa pagesë. Veçoritë premium (plani personal i dietës, skaneri, tracker-i, progresi dhe Pyet Nutricionistin) hapen pasi aktivizon kodin që gjendet në paketën SoHealthy që ke blerë.', 2),
  ('Llogaria dhe regjistrimi', 'Çfarë është "Username-i" dhe a mund ta ndryshoj më vonë?', 'Username-i është emri yt unik në aplikacion (p.sh. pavli). Duhet të ketë të paktën 3 karaktere dhe të mos jetë i zënë nga dikush tjetër. Mund ta ndryshosh kurdo te Profili → Ndrysho Emrin & Username.', 3),
  ('Llogaria dhe regjistrimi', 'Më del "Ky email është regjistruar tashmë". Çfarë të bëj?', 'Do të thotë që ke krijuar një llogari më parë me këtë email. Shko te "Hyr në llogari" dhe kyçu me fjalëkalimin tënd. Nëse nuk e mban mend fjalëkalimin, përdor "Harrova fjalëkalimin?".', 4),
  ('Llogaria dhe regjistrimi', 'Fjalëkalimi nuk po pranohet.', 'Fjalëkalimi duhet të ketë minimumi 8 karaktere. Nëse është më i shkurtër, fusha bëhet e kuqe dhe të tregon sa karaktere të mbeten.', 5),
  ('Llogaria dhe regjistrimi', 'Ky username është i zënë — çfarë të bëj?', 'Zgjidh një tjetër (shto një numër ose një pikë, p.sh. pavli.b). Aplikacioni të njofton menjëherë nëse username-i është i lirë.', 6),
  ('Konfirmimi i email-it', 'Pse më kërkohet një kod pas regjistrimit?', 'Për të konfirmuar që email-i është i yti. Menjëherë pas regjistrimit të dërgojmë një kod 6-shifror në email. Shkruaje atë në ekranin e konfirmimit dhe llogaria aktivizohet.', 7),
  ('Konfirmimi i email-it', 'Nuk më erdhi kodi. Ku ta gjej?', 'Prit 1–2 minuta dhe kontrollo dosjen Spam / Promotions — shpesh email-i përfundon aty. Nëse prapë nuk vjen, shtyp "Ridërgo kodin" (butoni aktivizohet pas 60 sekondash).', 8),
  ('Konfirmimi i email-it', 'Më thotë "Kodi ka skaduar".', 'Çdo kod ka afat. Shtyp "Ridërgo kodin" për të marrë një kod të ri dhe përdor gjithmonë kodin nga email-i më i fundit — kodet e vjetra nuk vlejnë më.', 9),
  ('Konfirmimi i email-it', 'Shkrova kodin e saktë por prapë del gabim.', 'Sigurohu që po përdor kodin nga email-i i fundit që të erdhi (jo një të mëparshëm). Nëse ke kërkuar kodin disa herë, vetëm i fundit është i vlefshëm. Provo "Ridërgo kodin" dhe fut menjëherë kodin e ri.', 10),
  ('Fjalëkalimi', 'Harrova fjalëkalimin. Si e rivendos?', 'Në ekranin "Hyr në llogari" shtyp "Harrova fjalëkalimin?". Shkruaj email-in, merr kodin 6-shifror, verifikoje dhe pastaj cakto një fjalëkalim të ri.', 11),
  ('Fjalëkalimi', 'Si e ndryshoj fjalëkalimin kur jam i kyçur?', 'Shko te Profili → Ndrysho Fjalëkalimin. Fut fjalëkalimin e vjetër, pastaj të riun dy herë. Fjalëkalimi i ri duhet të jetë minimumi 8 karaktere dhe i ndryshëm nga i vjetri.', 12),
  ('Aktivizimi', 'Ku e gjej kodin e aktivizimit?', 'Kodi gjendet brenda paketës SoHealthy, i shkruar në letër (p.sh. HY8364125). Është kodi që hap të gjitha veçoritë premium.', 13),
  ('Aktivizimi', 'Si e aktivizoj paketën time?', 'Shko te "Aktivizo" (ose shtyp "Aktivizo Tani" te ekrani kryesor), shkruaj kodin e porosisë dhe shtyp "Aktivizo". Pas suksesit, llogaria bëhet Premium dhe hapen të gjitha mjetet.', 14),
  ('Aktivizimi', 'Më thotë "Kodi që shkruat nuk u gjet".', 'Kontrollo shkronjat dhe numrat me kujdes (kodi shkruhet me shkronja të mëdha). Sigurohu që nuk ke ngatërruar 0 (zero) me O, ose 1 me I. Nëse prapë nuk pranohet, na shkruaj në info@sohealthy.al.', 15),
  ('Aktivizimi', 'Më thotë "Ky kod është përdorur tashmë".', 'Çdo kod përdoret vetëm një herë. Nëse mendon se ka një gabim, na kontakto në info@sohealthy.al dhe do ta shohim menjëherë.', 16),
  ('Aktivizimi', 'Bleva një paketë të re. Si e aktivizoj kodin e ri?', 'Shko te Produktet → Aktivizo Kod të Ri (ose te Aktivizo) dhe fut kodin e ri. Kështu fillon me produktin dhe dietën e re, dhe koha jote premium rifreskohet.', 17),
  ('Aktivizimi', 'Sa zgjat aksesi premium pas aktivizimit?', 'Aksesi ka një afat të caktuar që shfaqet te ekrani kryesor si "ditë të mbetura". Kur mbeten pak ditë, shifra bëhet e kuqe si kujtesë. Aktivizo një kod të ri për ta rifreskuar.', 18),
  ('Paketat dhe produktet', 'Ku i shoh produktet dhe udhëzimet e mia?', 'Te skeda Produktet ("Paketat e Mia"). Aty shfaqet kodi yt aktiv, produkti/produktet e tua, orari i ditës, si përdoren dhe si ruhen.', 19),
  ('Paketat dhe produktet', 'Si e zgjedh produktin që kam blerë?', 'Pas aktivizimit, të kërkohet të zgjedhësh produktin nga lista. Shtyp produktin që ke në dorë dhe konfirmoje — pastaj sheh udhëzimet e personalizuara për të.', 20),
  ('Paketat dhe produktet', 'Si e ndryshoj produktin e zgjedhur?', 'Te Produktet → Ndrysho Produktet, zgjidh produktin e ri dhe konfirmoje.', 21),
  ('Paketat dhe produktet', 'Si duhet ta ruaj produktin?', 'Varet nga produkti. Shot-et (50ml) ruhen në frigorifer (2–6°C). Qeskat/sachet-et (G1, NF-01, Fiber+, Green Organics) ruhen në vend të thatë e të freskët — jo në frigorifer. Udhëzimi i saktë shfaqet te faqja e produktit tënd.', 22),
  ('Paketat dhe produktet', 'Kur duhet ta pi produktin?', 'Shumica e shot-eve pihen në mëngjes, me stomak bosh, 15–20 minuta para ngrënies. Nëse ke një kombinim produktesh, aplikacioni të tregon orarin e ditës me orët përkatëse (p.sh. Detox në mëngjes, Green Shot para drekës).', 23),
  ('Paketat dhe produktet', 'Ku e shoh historinë e blerjeve?', 'Te Produktet → Shiko Historinë e Blerjeve.', 24),
  ('Mjetet falas', 'Cilat mjete janë falas?', 'Te ekrani kryesor, seksioni MJETET FALAS: Quiz-i "Gjej Paketën Perfekte Për Ty", Challenge 30-ditor, Llogaritje Trupi (BMI, TDEE, makro), Mosha Metabolike dhe Plan Diete Falas 7 Ditë. Të gjitha hapen brenda aplikacionit dhe janë pa pagesë.', 25),
  ('Mjetet falas', 'Çfarë bën quiz-i?', 'Të bën disa pyetje të shpejta dhe në fund të rekomandon paketën perfekte për ty, bashkë me sa kg mund të humbësh me të. Zgjat rreth 2 minuta.', 26),
  ('Mjetet falas', 'Çfarë është "Zbulo Profilin Tënd Nutricional"?', 'Një pyetësor falas me 12 pyetje (rreth 2 minuta) që të jep një profil nutricional personal.', 27),
  ('Mjetet falas', 'A më duhet internet për mjetet falas?', 'Po. Këto mjete hapen si faqe brenda aplikacionit, ndaj duhet lidhje interneti.', 28),
  ('Veçoritë premium', 'Cilat janë veçoritë premium?', 'Plani personal i Dietës, Skaneri i ushqimeve, Tracker-i, Progresi, Pyet Nutricionistin dhe Libri RESET. Këto hapen pasi aktivizon kodin e porosisë.', 29),
  ('Veçoritë premium', 'Si funksionon Plani i Dietës?', 'Te "Plani i Dietës", shtyp "Gjenero Planin Tim". Plani personalizohet sipas moshës, peshës, aktivitetit dhe produkteve të tua SoHealthy. Merr një plan 14-ditor me qëllimin ditor të kalorive dhe mund ta ndash me të tjerët.', 30),
  ('Veçoritë premium', 'Si përdoret Skaneri i ushqimeve?', 'Te "Skaner", shtyp "Bëj Foto" (ose "Ngarko nga Galeria"), fotografo pjatën dhe brenda pak sekondash merr kaloritë, makrot, një vlerësim të pjatës dhe sa hapa duhet të ecësh për ta djegur. Çdo skanim ruhet automatikisht në historik.', 31),
  ('Veçoritë premium', 'Sa të sakta janë vlerësimet e skanerit?', 'Vlerësimet janë të përafërta dhe shërbejnë vetëm për orientim. Nuk zëvendësojnë këshillën e një mjeku ose nutricionisti. Fotografitë analizohen me AI dhe nuk ruhen.', 32),
  ('Veçoritë premium', 'Skaneri më kërkon leje për kamerën/galerinë. Pse?', 'I duhet leja për të hapur kamerën ose galerinë vetëm në momentin kur fotografon një pjatë. Pa këtë leje, skaneri nuk mund të marrë foto.', 33),
  ('Veçoritë premium', 'Si funksionon Tracker-i?', 'Te "Tracker" sheh kaloritë e sotme kundrejt qëllimit tënd, regjistron peshën (Shto → fut peshën në kg) dhe ndjek historikun e kalorive dhe peshës ditë pas dite. Kaloritë mblidhen automatikisht nga skanimet e tua.', 34),
  ('Veçoritë premium', 'Si e regjistroj peshën?', 'Te Tracker → Pesha → Shto, fut peshën e sotme (p.sh. 65.5) dhe shtyp "Ruaj". Për të fshirë një hyrje, mbaje shtypur atë rresht.', 35),
  ('Veçoritë premium', 'Çfarë është "Pyet Nutricionistin"?', 'Një veçori premium ku i bën një pyetje direkt Pavlit. Shkruan pyetjen, e dërgon, dhe merr njoftim kur Pavli të përgjigjet. Përgjigja shfaqet te "Pyetjet e Mia".', 36),
  ('Veçoritë premium', 'Pse nuk mund të bëj një pyetje tjetër te "Pyet Nutricionistin"?', 'Me çdo kod aktivizimi mund të bësh një pyetje. Për të bërë një pyetje tjetër, aktivizo një kod të ri (paketë të re).', 37),
  ('Veçoritë premium', 'Çfarë është Libri RESET?', 'Një udhëzues i shpejtë nga Pavli, i disponueshëm për përdoruesit premium. Hapet direkt brenda aplikacionit te seksioni Premium në ekranin kryesor.', 38),
  ('Veçoritë premium', 'Përse më dalin veçoritë premium me dry (të kyçura)?', 'Do të thotë që llogaria nuk është ende premium. Aktivizo kodin e porosisë dhe të gjitha hapen menjëherë.', 39),
  ('Profili dhe të dhënat', 'Ku i shoh të dhënat e llogarisë sime?', 'Te skeda "Profili im": emri, username-i, email-i, statusi (Premium ose Falas) dhe data kur ke filluar.', 40),
  ('Profili dhe të dhënat', 'Si dal nga llogaria (logout)?', 'Te Profili → Dil nga llogaria.', 41),
  ('Profili dhe të dhënat', 'Si e fshij llogarinë time?', 'Te Profili → Fshi Llogarinë. Do të kërkohet fjalëkalimi për të konfirmuar. Ky veprim është i pakthyeshëm — të gjitha të dhënat e tua fshihen përfundimisht.', 42),
  ('Profili dhe të dhënat', 'Ku e gjej Politikën e Privatësisë?', 'Te fundi i ekranit Profili → Politika e Privatësisë.', 43),
  ('Probleme të zakonshme', 'Aplikacioni nuk po ngarkon një mjet / faqe.', 'Kontrollo lidhjen e internetit dhe provo përsëri. Mjetet falas dhe disa veçori kërkojnë internet.', 44),
  ('Probleme të zakonshme', '"Nuk ka lidhje me internetin".', 'Kontrollo Wi-Fi ose të dhënat celulare dhe provo sërish. Nëse je në një zonë me sinjal të dobët, provo më vonë.', 45),
  ('Probleme të zakonshme', 'Bëra gjithçka por prapë kam problem. Si ju kontaktoj?', 'Na shkruaj në info@sohealthy.al me email-in e llogarisë dhe kodin e porosisë (nëse ke) — do të të përgjigjemi sa më shpejt.', 46),
  ('Kontakti', 'Si mund t''ju kontaktoj?', 'Email: info@sohealthy.al · Website: sohealthy.al · Instagram: @sohealthy.al', 47);
