// Kategorije troškova i ostalih prihoda firme u kasi (stavke tipa "trosak" / "ostali_prihod").
// Napravljeno po stvarnim stavkama iz dosadašnje Excel evidencije (list TROŠKOVI i gornji deo RENTE).

export const TROSAK_KAT: Record<string, string> = {
  vlasnik_kb:   "Isplata vlasniku komunalnog broja",
  yandex_3:     "Yandex 3% (isplata partneru)",
  plate:        "Plate i zamene smena",
  kancelarija:  "Kancelarija i dispečerski",
  pranje:       "Pranje vozila",
  registracija: "Registracija i tehnički",
  servis:       "Servis, delovi, gume, šlep",
  taksimetar:   "Taksimetri (baždarenje)",
  gorivo:       "Gorivo (službeno)",
  promocija:    "Promocija",
  banka:        "Bankarske provizije",
  usluge:       "Usluge (advokat, knjigovodstvo...)",
  ostalo:       "Ostalo",
};

export const PRIHOD_KAT: Record<string, string> = {
  refundacija:   "Refundacija troška (delovi, guma, akumulator, inspekcijski)",
  nalepnica:     "Nalepnice i oprema",
  interna_kazna: "Interna kazna",
  cng:           "CNG",
  ostalo:        "Ostalo",
};

export const categoryLabel = (type: string, category?: string | null) =>
  !category ? "" : type === "trosak" ? TROSAK_KAT[category] ?? category : type === "ostali_prihod" ? PRIHOD_KAT[category] ?? category : category;
