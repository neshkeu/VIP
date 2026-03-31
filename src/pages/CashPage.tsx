import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { useCash } from "@/hooks/useCash";
import { useObracun } from "@/hooks/useObracun";
import { useCalendar } from "@/hooks/useCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ArrowUpRight, Plus, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { StatCard } from "@/components/StatCard";

const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];
const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];
function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }
function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${DAYS_SR[dt.getDay()]}, ${dt.getDate()}. ${MONTHS_SR[dt.getMonth()]}`;
}
function isObracunDay(date: string) {
  const dow = new Date(date + "T00:00:00").getDay();
  return dow === 1 || dow === 3 || dow === 5;
}
function getDatesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + "T00:00:00");
  const end   = new Date(to   + "T00:00:00");
  if (start > end) return [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
    dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
  }
  return dates;
}

const CASH_TYPE_LABELS: Record<string,string> = {
  renta:"Renta",clanarina:"Članarina",pos_naknada:"POS naknada",
  komunalni:"Komunalni",doprinosi:"Doprinosi",dugovanje:"Uplata dugovanja",
  likvidnost_in:"Likvidnost — ulaz",yandex:"Yandex isplata",
  kartica:"Kartica isplata",vaučer:"Vaučer",pdv_gorivo:"PDV gorivo",
  likvidnost_out:"Podizanje gotovine",
};
const CASH_TYPE_COLORS: Record<string,string> = {
  renta:"text-green-700",clanarina:"text-green-700",pos_naknada:"text-green-700",
  komunalni:"text-green-700",doprinosi:"text-green-700",dugovanje:"text-blue-700",
  likvidnost_in:"text-purple-700",yandex:"text-orange-700",kartica:"text-orange-700",
  vaučer:"text-red-700",pdv_gorivo:"text-red-700",likvidnost_out:"text-red-700",
};
const ULAZ_TYPES  = ["renta","clanarina","pos_naknada","komunalni","doprinosi","dugovanje","likvidnost_in"];
const IZLAZ_TYPES = ["yandex","kartica","vaučer","pdv_gorivo","likvidnost_out"];
const NO_DRIVER_TYPES = ["likvidnost_in","likvidnost_out"];

// ─── KALENDAR MINI komponenta unutar dialoga ─────────────────
function MiniCalendar({ driverId, dateFrom, dateTo, cal }: { driverId: string; dateFrom: string; dateTo: string; cal: any }) {
  const dates = getDatesInRange(dateFrom, dateTo);
  if (!dates.length || !driverId) return null;

  // Posljednja uplata za vozača iz calendar_entries
  const lastPaidDate = driverId !== "none"
    ? [...cal.entries]
        .filter((e: any) => e.driver_id === driverId && e.status === "izmireno")
        .sort((a: any, b: any) => b.date.localeCompare(a.date))[0]?.date ?? null
    : null;

  return (
    <div className="space-y-1.5">
      {/* Posljednja uplata */}
      {lastPaidDate && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Poslednji izmireni dan: </span>
          <strong>{fmtDate(lastPaidDate)}</strong>
        </div>
      )}
      <p className="text-xs font-semibold text-muted-foreground uppercase">Dani koji se čekiraju</p>
      <div className="flex flex-wrap gap-1.5">
        {dates.map(date => {
          const dow = new Date(date + "T00:00:00").getDay();
          const isSun = dow === 0;
          const existing = cal.getStatus(driverId, date);
          return (
            <div key={date} className={`rounded-md px-2 py-1 text-xs font-medium ${
              isSun ? "bg-gray-100 text-gray-400" :
              existing === "izmireno" ? "bg-green-100 text-green-700 line-through opacity-60" :
              "bg-primary/10 text-primary"
            }`}>
              {date.slice(8)}. {DAYS_SR[dow]}
              {existing === "izmireno" && " ✓"}
              {isSun && " —"}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Nedjelje su označene sivom bojom</p>
    </div>
  );
}

// ─── NOVI UNOS DIALOG ────────────────────────────────────────
function NewEntryDialog({ onAdd, currentUser }: { onAdd: (e: any) => Promise<void>; currentUser: string }) {
  const { drivers } = useApp();
  const today = new Date().toISOString().split("T")[0];

  const [open,setOpen]          = useState(false);
  const [dir,setDir]            = useState<"in"|"out">("in");
  const [type,setType]          = useState("renta");
  const [driverId,setDriverId]  = useState("none");
  const [amount,setAmount]      = useState("");
  const [desc,setDesc]          = useState("");
  const [date,setDate]          = useState(today);
  const [dateFrom,setDateFrom]  = useState(today);
  const [dateTo,setDateTo]      = useState(today);
  const [saving,setSaving]      = useState(false);

  const driver = drivers.find(d => d.id === driverId);
  const isRenta = type === "renta" && dir === "in";

  // Kalendar hook za renta period
  const rentaDates  = isRenta && driverId !== "none" && dateFrom && dateTo ? getDatesInRange(dateFrom, dateTo) : [];
  const calYear     = dateFrom ? Number(dateFrom.slice(0,4)) : new Date().getFullYear();
  const calMonth    = dateFrom ? Number(dateFrom.slice(5,7)) : new Date().getMonth()+1;
  const cal         = useCalendar(calYear, calMonth);

  // Automatski preračunaj iznos kad se promijeni period ili vozač
  const workDays    = rentaDates.filter(d => new Date(d+"T00:00:00").getDay() !== 0).length;
  const autoAmount  = isRenta && driver ? workDays * driver.daily_rate : 0;

  const driverRequired = !NO_DRIVER_TYPES.includes(type);
  const canSave = isRenta
    ? driverId !== "none" && rentaDates.length > 0 && !saving
    : !!amount && Number(amount) > 0 && (!driverRequired || driverId !== "none") && !saving;

  const reset = () => {
    setDir("in"); setType("renta"); setDriverId("none");
    setAmount(""); setDesc(""); setDate(today);
    setDateFrom(today); setDateTo(today);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isRenta && driver) {
        // Unesi u kasu
        await onAdd({
          type: "renta", direction: "in", driver_id: driverId,
          amount: autoAmount, date: dateTo,
          description: `Renta ${dateFrom} — ${dateTo} (${workDays} dana)`,
          received_by: currentUser, notes: ""
        });
        // Čekiraj svaki radni dan u kalendaru
        for (const d of rentaDates) {
          if (new Date(d+"T00:00:00").getDay() === 0) continue;
          await cal.saveAmount(driverId, d, "renta", driver.daily_rate, currentUser);
          await cal.saveStatus(driverId, d, "izmireno", currentUser);
        }
        toast.success(`Evidentirano ${fmt(autoAmount)} za ${workDays} dana`);
      } else {
        await onAdd({
          type, direction: dir,
          driver_id: driverId === "none" ? null : driverId,
          amount: Number(amount), date,
          description: desc, received_by: currentUser, notes: ""
        });
        toast.success(`Evidentirano: ${dir==="in"?"+":"−"}${fmt(Number(amount))}`);
      }
      setOpen(false); reset();
    } catch (e: any) { toast.error("Greška: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Novi unos</Button></DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novi kasa unos</DialogTitle>
          <DialogDescription>Evidentira: <strong>{currentUser}</strong></DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {/* Ulaz/Izlaz */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>{setDir("in");setType("renta");setDriverId("none");}} className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-all ${dir==="in"?"bg-green-50 border-green-500 text-green-700":"hover:bg-muted border-border"}`}><ArrowDownLeft className="h-4 w-4"/>Ulaz (+)</button>
            <button type="button" onClick={()=>{setDir("out");setType("yandex");setDriverId("none");}} className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-all ${dir==="out"?"bg-red-50 border-red-500 text-red-700":"hover:bg-muted border-border"}`}><ArrowUpRight className="h-4 w-4"/>Izlaz (−)</button>
          </div>

          {/* Tip */}
          <div className="grid gap-2">
            <Label>Tip</Label>
            <Select value={type} onValueChange={v=>{setType(v);setDriverId("none");}}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{(dir==="in"?ULAZ_TYPES:IZLAZ_TYPES).map(t=><SelectItem key={t} value={t}>{CASH_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Vozač */}
          <div className="grid gap-2">
            <Label>Vozač {driverRequired ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(opciono)</span>}</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger className={driverRequired && driverId==="none" ? "border-destructive/50" : ""}><SelectValue/></SelectTrigger>
              <SelectContent>
                {!driverRequired && <SelectItem value="none">— Bez vozača —</SelectItem>}
                {drivers.map(d=><SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* RENTA — period + kalendar */}
          {isRenta && driverId !== "none" && driver ? (
            <>
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Dnevna renta: <strong className="text-foreground">{fmt(driver.daily_rate)}</strong>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Od</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/></div>
                <div className="grid gap-2"><Label>Do</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}/></div>
              </div>
              {rentaDates.length > 0 && (
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Radnih dana:</span>
                    <span className="font-semibold">{workDays}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ukupno:</span>
                    <span className="font-bold text-green-600 text-base">{fmt(autoAmount)}</span>
                  </div>
                </div>
              )}
              <MiniCalendar driverId={driverId} dateFrom={dateFrom} dateTo={dateTo} cal={cal}/>
            </>
          ) : (
            /* Ostali tipovi — klasičan unos */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Iznos (RSD)</Label><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
                <div className="grid gap-2"><Label>Datum</Label><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
              </div>
              {isObracunDay(date)&&<div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700"><CheckCircle2 className="h-3.5 w-3.5"/>Obračunski dan</div>}
              <div className="grid gap-2"><Label>Opis</Label><Input value={desc} onChange={e=>setDesc(e.target.value)}/></div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Otkazi</Button>
          <Button disabled={!canSave} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
            {isRenta ? "Sačuvaj i čekiraj kalendar" : "Sačuvaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ObracunCard({ date, entries, obracun }: { date: string; entries: any[]; obracun: any }) {
  const { drivers, displayName } = useApp();
  const [expanded,setExpanded]=useState(false);
  const [closeOpen,setCloseOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const total_in =entries.filter(e=>e.direction==="in").reduce((s,e)=>s+e.amount,0);
  const total_out=entries.filter(e=>e.direction==="out").reduce((s,e)=>s+e.amount,0);
  const confirmed  =obracun?.isConfirmed(date)??false;
  const confirmedBy=obracun?.getConfirmedBy(date)??"";

  return (
    <motion.div layout initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}>
      <Card className={`overflow-hidden border-l-4 ${confirmed?"border-l-green-500":"border-l-amber-400"}`}>
        <div className="py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {confirmed?<CheckCircle2 className="h-5 w-5 text-green-500"/>:<Clock className="h-5 w-5 text-amber-500"/>}
              <div>
                <p className="font-semibold text-sm">{fmtDate(date)}</p>
                <p className="text-xs text-muted-foreground">{confirmed?`Zatvoren — ${confirmedBy}`:"Nije zatvoren"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="text-right hidden sm:block"><p className="text-xs text-muted-foreground">Ulaz</p><p className="font-semibold text-green-600">+{fmt(total_in)}</p></div>
              <div className="text-right hidden sm:block"><p className="text-xs text-muted-foreground">Izlaz</p><p className="font-semibold text-red-500">−{fmt(total_out)}</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Bilans</p><p className="font-bold">{fmt(total_in-total_out)}</p></div>
              <button onClick={()=>setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground ml-1">{expanded?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {expanded&&(
            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
              <Separator/>
              {entries.length===0?<p className="text-center text-muted-foreground text-sm py-4">Nema unosa</p>:(
                <Table>
                  <TableHeader><TableRow><TableHead>Tip</TableHead><TableHead>Vozač</TableHead><TableHead>Opis</TableHead><TableHead>Iznos</TableHead><TableHead>Evidentirao</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {entries.map(e=>{
                      const driver=e.driver_id?drivers.find((d:any)=>d.id===e.driver_id):null;
                      return(
                        <TableRow key={e.id}>
                          <TableCell><Badge variant="outline" className={`text-xs ${CASH_TYPE_COLORS[e.type]??""}`}>{CASH_TYPE_LABELS[e.type]??e.type}</Badge></TableCell>
                          <TableCell className="text-sm font-medium">{driver?.full_name??<span className="text-muted-foreground text-xs">—</span>}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                          <TableCell><span className={`font-bold text-sm ${e.direction==="in"?"text-green-600":"text-red-500"}`}>{e.direction==="in"?"+":"−"}{fmt(e.amount)}</span></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.received_by}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <div className="p-3 border-t flex items-center justify-between gap-3 flex-wrap">
                {!confirmed?(
                  <div className="flex items-center gap-2 flex-wrap w-full">
                    <div className="flex items-center gap-2 text-sm text-amber-700 flex-1"><AlertCircle className="h-4 w-4 flex-shrink-0"/><span>Nije zatvoren — bilans: <strong>{fmt(total_in-total_out)}</strong></span></div>
                    <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
                      <DialogTrigger asChild><Button size="sm"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5"/>Zatvori obračun</Button></DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle>Zatvori obračun</DialogTitle><DialogDescription>{fmtDate(date)} — bilans: {fmt(total_in-total_out)}</DialogDescription></DialogHeader>
                        <p className="py-3 text-sm">Zatvara: <strong>{displayName}</strong></p>
                        <DialogFooter>
                          <Button variant="outline" onClick={()=>setCloseOpen(false)}>Otkazi</Button>
                          <Button disabled={saving} onClick={async()=>{
                            setSaving(true);
                            try{await obracun.closeObracun(date,displayName,total_in,total_out);toast.success(`Obračun zatvoren — ${displayName}`);setCloseOpen(false);}
                            catch(e:any){toast.error("Greška: "+e.message);}finally{setSaving(false);}
                          }}>{saving&&<Loader2 className="h-4 w-4 animate-spin mr-2"/>}Zatvori</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ):(
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4"/><span>Zatvoren — <strong>{confirmedBy}</strong></span></div>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={saving}
                      onClick={async()=>{setSaving(true);try{await obracun.stornoObracun(date);toast.success("Obračun storniran");}catch(e:any){toast.error("Greška: "+e.message);}finally{setSaving(false);}}}>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5"/>Storniraj
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

const CashPage = () => {
  const today = new Date();
  const [filterMonth,setFilterMonth]=useState(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`);
  const {entries,loading,addEntry,total_in,total_out,balance}=useCash(filterMonth);
  const obracun=useObracun(filterMonth);
  const { drivers: allDrivers, displayName }=useApp();

  const byDate=entries.reduce((acc,e)=>{if(!acc[e.date])acc[e.date]=[];acc[e.date].push(e);return acc;},{} as Record<string,any[]>);
  const [year,month]=filterMonth.split("-").map(Number);
  const daysInMonth=new Date(year,month,0).getDate();
  const todayStr=today.toISOString().split("T")[0];
  const obracunDates:string[]=[];
  for(let d=1;d<=daysInMonth;d++){const dow=new Date(year,month-1,d).getDay();if(dow===1||dow===3||dow===5)obracunDates.push(`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`);}
  const futureOrToday=obracunDates.filter(d=>d>=todayStr);
  const currentObracun=futureOrToday.length>0?futureOrToday[0]:obracunDates[obracunDates.length-1];
  const historyDates=obracunDates.filter(d=>d<currentObracun).sort().reverse();
  const lastHistory=historyDates[0]??"0000-00-00";
  const currentEntries=entries.filter(e=>e.date>lastHistory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-display font-bold">Kasa</h1><p className="text-muted-foreground text-sm">Evidencija uplata i isplata · Obračun: pon/sri/pet</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="w-40 h-9"/>
          <NewEntryDialog onAdd={addEntry} currentUser={displayName}/>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Ulaz ovaj mj." value={fmt(total_in)} icon={ArrowDownLeft}/>
        <StatCard title="Izlaz ovaj mj." value={fmt(total_out)} icon={ArrowUpRight}/>
        <div className={`rounded-xl border p-4 flex flex-col gap-1 ${balance>=0?"bg-green-50 border-green-200":"bg-red-50 border-red-200"}`}>
          <p className="text-sm text-muted-foreground">Bilans ovaj mj.</p>
          <p className={`text-2xl font-bold font-display ${balance>=0?"text-green-600":"text-red-500"}`}>{balance>=0?"+":""}{fmt(balance)}</p>
        </div>
      </div>
      {loading?<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>:(
        <Tabs defaultValue="tekuci">
          <TabsList><TabsTrigger value="tekuci">Tekući obračun</TabsTrigger><TabsTrigger value="istorija">Istorija</TabsTrigger><TabsTrigger value="sve">Svi unosi</TabsTrigger></TabsList>
          <TabsContent value="tekuci" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Naredni obračun: <strong>{fmtDate(currentObracun)}</strong></p>
            <ObracunCard date={currentObracun} entries={currentEntries} obracun={obracun}/>
          </TabsContent>
          <TabsContent value="istorija" className="mt-4 space-y-3">
            {historyDates.length===0?<Card><CardContent className="py-10 text-center text-muted-foreground">Nema zatvorenih obračuna</CardContent></Card>
              :historyDates.map(date=><ObracunCard key={date} date={date} entries={byDate[date]??[]} obracun={obracun}/>)}
          </TabsContent>
          <TabsContent value="sve" className="mt-4">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Tip</TableHead><TableHead>Vozač</TableHead><TableHead>Opis</TableHead><TableHead>Iznos</TableHead><TableHead>Evidentirao</TableHead></TableRow></TableHeader>
                <TableBody>
                  {entries.length===0?<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nema unosa</TableCell></TableRow>
                    :entries.map(e=>{
                      const driver=e.driver_id?allDrivers.find((d:any)=>d.id===e.driver_id):null;
                      return(
                        <TableRow key={e.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(e.date)}</TableCell>
                          <TableCell><Badge variant="outline" className={`text-xs ${CASH_TYPE_COLORS[e.type]??""}`}>{CASH_TYPE_LABELS[e.type]??e.type}</Badge></TableCell>
                          <TableCell className="text-sm font-medium">{driver?.full_name??<span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                          <TableCell><span className={`font-bold text-sm ${e.direction==="in"?"text-green-600":"text-red-500"}`}>{e.direction==="in"?"+":"−"}{fmt(e.amount)}</span></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.received_by}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
export default CashPage;
