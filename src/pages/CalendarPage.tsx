import { useState } from "react";
import { useDrivers } from "@/hooks/useDrivers";
import { useVehicles } from "@/hooks/useVehicles";
import { useCalendar } from "@/hooks/useCalendar";
import { useMonthlyAssignments } from "@/hooks/useMonthlyAssignments";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, X, Loader2, Pencil, Trash2, Car, Plus, Home } from "lucide-react";
import { toast } from "sonner";

const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];
const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];

function getDaysInMonth(y:number,m:number){return new Date(y,m,0).getDate();}
function getDateStr(y:number,m:number,d:number){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function getDow(y:number,m:number,d:number){return new Date(y,m-1,d).getDay();}
function fmt(n:number){return n.toLocaleString("sr-RS")+" RSD";}

type DayStatus = "izmireno"|"neizmireno"|"nije_radio"|null;

// Nedjelja besplatna ako su SVIH 6 dana pon-sub te sedmice radio (izmireno ILI neizmireno)
// Gleda unazad: sub(-1), pet(-2), čet(-3), sri(-4), uto(-5), pon(-6)
function isSundayFree(entries: any[], driverId:string, sundayDate:string):boolean {
  if(!sundayDate||!driverId) return false;
  const [sy,sm,sd] = sundayDate.split("-").map(Number);
  for(let i=1;i<=6;i++){
    const y = sm===1&&sd-i<1 ? sy-1 : sy;
    const date = new Date(sy, sm-1, sd-i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const entry = entries.find(e => e.driver_id === driverId && e.date === dateStr);
    const s = entry?.status ?? null;
    if(s===null||s==="nije_radio") return false;
  }
  return true;
}

function getAutoAmount(driver:any,type:string,half=false):number{
  let base=0;
  if(type==="renta") base=driver.daily_rate??0;
  else if(type==="clanarina") base=driver.driver_type==="renta"?driver.weekly_membership:driver.weekly_membership_own;
  else if(type==="pos_naknada") base=driver.pos_monthly_fee??0;
  return half?Math.round(base/2):base;
}

const ULAZ_TYPES=[{value:"renta",label:"Renta"},{value:"clanarina",label:"Članarina"},{value:"pos_naknada",label:"POS naknada"}];

function DetailModal({open,onClose,driver,date,cal,currentUser,vehicle}:{open:boolean;onClose:()=>void;driver:any;date:string;cal:any;currentUser:string;vehicle:any;}){
  const [entryType,setEntryType]=useState("renta");
  const [entryAmount,setEntryAmount]=useState("");
  const [addOpen,setAddOpen]=useState(false);
  const [editEntry,setEditEntry]=useState<any>(null);
  const [editAmount,setEditAmount]=useState("");
  const [saving,setSaving]=useState(false);

  if(!driver||!date) return null;
  const dow=new Date(date+"T00:00:00").getDay();
  const isSun=dow===0;
  const status=cal.getStatus(driver.id,date) as DayStatus;
  const sunFree=isSun?isSundayFree(cal.entries,driver.id,date):false;
  const entries=cal.getAmounts(driver.id,date);

  const handleTypeChange=(type:string,half=false)=>{
    setEntryType(type);
    const auto=getAutoAmount(driver,type,half);
    if(auto>0) setEntryAmount(String(auto));
  };

  const handleSaveEntry=async(newStatus:DayStatus)=>{
    if(!entryAmount){toast.error("Unesi iznos!");return;}
    setSaving(true);
    try{
      await cal.saveAmount(driver.id,date,entryType,Number(entryAmount),currentUser);
      await cal.saveStatus(driver.id,date,newStatus!,currentUser);
      toast.success(`Evidentirano ${fmt(Number(entryAmount))} — ${newStatus}`);
      setAddOpen(false);setEntryAmount("");onClose();
    }catch(e:any){toast.error("Greška: "+e.message);}finally{setSaving(false);}
  };

  const handleNijeRadio=async()=>{
    setSaving(true);
    try{
      const polurenta=getAutoAmount(driver,"renta",true);
      if(polurenta>0) await cal.saveAmount(driver.id,date,"renta",polurenta,currentUser);
      await cal.saveStatus(driver.id,date,"nije_radio",currentUser);
      toast.success(`Nije radio — pola rente: ${fmt(polurenta)}`);
      onClose();
    }catch(e:any){toast.error("Greška: "+e.message);}finally{setSaving(false);}
  };

  return(
    <Dialog open={open} onOpenChange={v=>{if(!v){setAddOpen(false);setEntryAmount("");setEditEntry(null);}onClose();}}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{driver.full_name}</DialogTitle>
          <DialogDescription>
            {DAYS_SR[dow]}, {date}
            {vehicle&&<span className="ml-2">· <Car className="h-3 w-3 inline mb-0.5"/> {vehicle.brand} {vehicle.model} ({vehicle.taxi_license_number})</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {status&&(
            <div className={`rounded-lg border p-2.5 text-center text-sm font-medium ${status==="izmireno"?"bg-green-50 border-green-300 text-green-700":status==="neizmireno"?"bg-red-50 border-red-300 text-red-700":"bg-gray-50 border-gray-300 text-gray-600"}`}>
              {status==="izmireno"&&"✓ Izmireno"}
              {status==="neizmireno"&&"✗ Neizmireno"}
              {status==="nije_radio"&&"🏠 Nije radio — pola rente"}
            </div>
          )}
          {isSun&&(
            <div className={`rounded-lg border p-2.5 text-center text-sm font-medium ${sunFree?"bg-green-50 border-green-300 text-green-700":"bg-amber-50 border-amber-300 text-amber-700"}`}>
              {sunFree?"🎉 Nedjelja oslobođena — radio sve pon–sub":"⚠️ Nedjelja se naplaćuje"}
            </div>
          )}
          {entries.length>0&&(
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Evidentirano</p>
              {entries.map((e:any)=>(
                <div key={e.id}>
                  {editEntry?.id===e.id?(
                    <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-1.5">
                      <Input type="number" value={editAmount} onChange={ev=>setEditAmount(ev.target.value)} className="h-7 text-sm flex-1"/>
                      <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={async()=>{if(!editAmount)return;setSaving(true);try{await cal.updateAmount(editEntry.id,Number(editAmount));toast.success("Ažurirano");setEditEntry(null);setEditAmount("");}catch(e:any){toast.error(e.message);}finally{setSaving(false);}}}>{saving?<Loader2 className="h-3 w-3 animate-spin"/>:"Sačuvaj"}</Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={()=>{setEditEntry(null);setEditAmount("");}}>✕</Button>
                    </div>
                  ):(
                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">{ULAZ_TYPES.find(t=>t.value===e.type)?.label??e.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-600">{fmt(e.amount)}</span>
                        <span className="text-xs text-muted-foreground">— {e.evidenced_by}</span>
                        <button onClick={()=>{setEditEntry(e);setEditAmount(String(e.amount));}} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3"/></button>
                        <button onClick={async()=>{setSaving(true);try{await cal.deleteAmount(e.id);toast.success("Obrisano");}catch(err:any){toast.error(err.message);}finally{setSaving(false);}}} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3"/></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <Separator/>
          <div className="text-xs text-muted-foreground">Evidentira: <strong>{currentUser}</strong></div>
          {!(isSun&&sunFree)&&(!addOpen?(
            <div className="space-y-2">
              {status!=="nije_radio"&&(
                <button onClick={handleNijeRadio} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all hover:bg-gray-50 hover:border-gray-400 border-gray-200 disabled:opacity-40">
                  {saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Home className="h-4 w-4 text-gray-500"/>}
                  Nije radio — pola rente ({fmt(getAutoAmount(driver,"renta",true))})
                </button>
              )}
              <Button variant="outline" size="sm" className="w-full h-8 text-xs"
                onClick={()=>{setAddOpen(true);handleTypeChange("renta");}}>+ Evidentiraj uplatu</Button>
            </div>
          ):(
            <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Nova uplata</p>
              <Select value={entryType} onValueChange={v=>handleTypeChange(v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>{ULAZ_TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Iznos RSD" className="h-8 text-sm" value={entryAmount} onChange={e=>setEntryAmount(e.target.value)}/>
              <p className="text-xs text-muted-foreground">Označi status <span className="text-destructive">*</span></p>
              <div className="grid grid-cols-2 gap-2">
                <button disabled={!entryAmount||saving} onClick={()=>handleSaveEntry("izmireno")} className="flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all disabled:opacity-40 hover:bg-green-50 hover:border-green-400 hover:text-green-700 border-gray-200">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Check className="h-4 w-4 text-green-600"/>}Izmireno</button>
                <button disabled={!entryAmount||saving} onClick={()=>handleSaveEntry("neizmireno")} className="flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all disabled:opacity-40 hover:bg-red-50 hover:border-red-400 hover:text-red-700 border-gray-200">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<X className="h-4 w-4 text-red-500"/>}Neizmireno</button>
              </div>
              <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={()=>setAddOpen(false)}>Otkazi</Button>
            </div>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Zatvori</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignModal({open,onClose,year,month,drivers,vehicles,monthlyAssignments,currentUser}:{open:boolean;onClose:()=>void;year:number;month:number;drivers:any[];vehicles:any[];monthlyAssignments:any;currentUser:string;}){
  const [driverId,setDriverId]=useState("none");
  const [vehicleId,setVehicleId]=useState("none");
  const [saving,setSaving]=useState(false);
  return(
    <Dialog open={open} onOpenChange={v=>{if(!v)onClose();}}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Zaduženja za {MONTHS_SR[month-1]} {year}</DialogTitle><DialogDescription>Dodjeli vozaču vozilo za ovaj mjesec</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          {monthlyAssignments.assignments.length>0&&(
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Trenutno zaduženi</p>
              {monthlyAssignments.assignments.map((a:any)=>{
                const driver=drivers.find((d:any)=>d.id===a.driver_id);
                const vehicle=vehicles.find((v:any)=>v.id===a.vehicle_id);
                return(
                  <div key={a.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <div><span className="font-medium">{driver?.full_name}</span><span className="text-muted-foreground mx-2">→</span><span className="text-muted-foreground">{vehicle?.brand} {vehicle?.model}</span><Badge variant="secondary" className="ml-2 text-xs font-mono">{vehicle?.taxi_license_number}</Badge></div>
                    <button onClick={async()=>{try{await monthlyAssignments.unassign(a.driver_id);toast.success(`${driver?.full_name} uklonjen`);}catch(e:any){toast.error(e.message);}}} className="text-muted-foreground hover:text-destructive ml-2"><X className="h-4 w-4"/></button>
                  </div>
                );
              })}
            </div>
          )}
          <Separator/>
          <p className="text-xs font-semibold text-muted-foreground uppercase">Novo zaduženje</p>
          <div className="grid gap-2"><Label className="text-xs">Vozač</Label>
            <Select value={driverId} onValueChange={setDriverId}><SelectTrigger><SelectValue placeholder="Izaberi vozača"/></SelectTrigger>
              <SelectContent>{drivers.filter((d:any)=>d.status==="active").map((d:any)=><SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2"><Label className="text-xs">Vozilo</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}><SelectTrigger><SelectValue placeholder="Izaberi vozilo"/></SelectTrigger>
              <SelectContent>{vehicles.filter((v:any)=>v.status==="active").map((v:any)=><SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button disabled={driverId==="none"||vehicleId==="none"||saving} onClick={async()=>{
            if(driverId==="none"||vehicleId==="none"){toast.error("Izaberi vozača i vozilo!");return;}
            setSaving(true);
            try{await monthlyAssignments.assign(driverId,vehicleId,currentUser);toast.success("Vozač zadužen");setDriverId("none");setVehicleId("none");}
            catch(e:any){toast.error("Greška: "+e.message);}finally{setSaving(false);}
          }} className="w-full">
            {saving&&<Loader2 className="h-4 w-4 animate-spin mr-2"/>}<Plus className="h-4 w-4 mr-2"/>Dodaj zaduženje
          </Button>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Zatvori</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Cell({status,isSun,sunFree,totalAmount,onClick,hasAssignment}:{status:DayStatus;isSun:boolean;sunFree:boolean;totalAmount:number;onClick:()=>void;hasAssignment:boolean;}){
  const bg=
    !hasAssignment       ?"bg-gray-50 border-gray-100":
    isSun&&sunFree        ?"bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer":
    isSun&&!sunFree       ?"bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-pointer":
    status==="izmireno"   ?"bg-green-100 border-green-300 hover:bg-green-200 cursor-pointer":
    status==="neizmireno" ?"bg-red-100 border-red-300 hover:bg-red-200 cursor-pointer":
    status==="nije_radio" ?"bg-gray-100 border-gray-300 hover:bg-gray-200 cursor-pointer":
                           "bg-white border-gray-100 hover:bg-muted/40 cursor-pointer";
  return(
    <td onClick={hasAssignment?onClick:undefined} className={`border p-0.5 transition-all min-w-[44px] w-11 ${bg}`}>
      <div className="flex flex-col items-center justify-center h-9 gap-0.5">
        {!hasAssignment&&<span className="text-gray-200 text-xs">—</span>}
        {hasAssignment&&isSun&&sunFree&&<span className="text-green-500 font-bold" style={{fontSize:"11px"}}>✓</span>}
        {hasAssignment&&isSun&&!sunFree&&<span className="text-amber-500 font-bold" style={{fontSize:"11px"}}>!</span>}
        {hasAssignment&&!isSun&&status==="izmireno"&&<Check className="h-3 w-3 text-green-600"/>}
        {hasAssignment&&!isSun&&status==="neizmireno"&&<X className="h-3 w-3 text-red-500"/>}
        {hasAssignment&&!isSun&&status==="nije_radio"&&<Home className="h-3 w-3 text-gray-400"/>}
        {hasAssignment&&totalAmount>0&&<span className="font-semibold text-primary leading-none" style={{fontSize:"9px"}}>{totalAmount>=1000?`${(totalAmount/1000).toFixed(1)}k`:totalAmount}</span>}
      </div>
    </td>
  );
}

const CalendarPage=()=>{
  const today=new Date();
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth()+1);
  const [modalOpen,setModalOpen]=useState(false);
  const [modalDriver,setModalDriver]=useState<any>(null);
  const [modalDate,setModalDate]=useState("");
  const [assignOpen,setAssignOpen]=useState(false);

  const {drivers,loading:loadingDrivers}=useDrivers();
  const {vehicles}=useVehicles();
  const cal=useCalendar(year,month);
  const monthlyAssignments=useMonthlyAssignments(year,month);
  const {displayName}=useCurrentUser();

  const activeDrivers=drivers.filter(d=>d.status==="active");
  const daysInMonth=getDaysInMonth(year,month);
  const days=Array.from({length:daysInMonth},(_,i)=>i+1);
  const prevMonth=()=>{if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextMonth=()=>{if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1);};

  const getDriverSummary=(driverId:string,driver:any)=>{
    const uplaceno=cal.amounts.filter((a:any)=>a.driver_id===driverId).reduce((s:number,a:any)=>s+a.amount,0);
    const neizmDays=cal.entries.filter((e:any)=>e.driver_id===driverId&&e.status==="neizmireno").length;
    const nijeRadioDays=cal.entries.filter((e:any)=>e.driver_id===driverId&&e.status==="nije_radio").length;
    const duguje=(neizmDays*(driver?.daily_rate??0))+(nijeRadioDays*Math.round((driver?.daily_rate??0)/2));
    return{uplaceno,duguje};
  };

  if(loadingDrivers||cal.loading||monthlyAssignments.loading)return(
    <div className="flex items-center justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>
  );

  return(
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-display font-bold">Kalendar</h1><p className="text-muted-foreground text-sm">Klikni na dan za detalje i unos</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4"/></Button>
          <span className="font-display font-bold text-lg min-w-[180px] text-center">{MONTHS_SR[month-1]} {year}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4"/></Button>
          <Button variant="outline" size="sm" onClick={()=>{setYear(today.getFullYear());setMonth(today.getMonth()+1);}}>Danas</Button>
          <Button size="sm" onClick={()=>setAssignOpen(true)}><Car className="mr-2 h-4 w-4"/>Zaduženja</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-green-100 border border-green-300 flex items-center justify-center"><Check className="h-2.5 w-2.5 text-green-600"/></div><span className="text-muted-foreground">Izmireno</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-red-100 border border-red-300 flex items-center justify-center"><X className="h-2.5 w-2.5 text-red-500"/></div><span className="text-muted-foreground">Neizmireno</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-gray-100 border border-gray-300 flex items-center justify-center"><Home className="h-2.5 w-2.5 text-gray-400"/></div><span className="text-muted-foreground">Nije radio (½ rente)</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-green-50 border border-green-200 flex items-center justify-center"><span className="text-green-500 font-bold" style={{fontSize:"10px"}}>✓</span></div><span className="text-muted-foreground">Ned. oslobođena</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-amber-50 border border-amber-200 flex items-center justify-center"><span className="text-amber-500 font-bold" style={{fontSize:"10px"}}>!</span></div><span className="text-muted-foreground">Ned. se naplaćuje</span></div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[180px]">Vozač / Vozilo</th>
              {days.map(day=>{
                const dow=getDow(year,month,day);const dateStr=getDateStr(year,month,day);
                const isTod=dateStr===today.toISOString().split("T")[0];const isSun=dow===0;const isOb=dow===1||dow===3||dow===5;
                return<th key={day} className={`border px-0.5 py-1.5 text-center min-w-[44px] w-11 ${isTod?"bg-primary/10 text-primary":isSun?"bg-gray-100 text-gray-500":isOb?"bg-green-50/70 text-green-700":"bg-muted/40 text-muted-foreground"}`}>
                  <div className="font-bold text-xs leading-none">{day}</div>
                  <div className="text-xs leading-none mt-0.5 font-normal opacity-60">{DAYS_SR[dow]}</div>
                </th>;
              })}
              <th className="sticky right-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase min-w-[130px]">Sumarno</th>
            </tr>
          </thead>
          <tbody>
            {activeDrivers.map(driver=>{
              const vehicleId=monthlyAssignments.getVehicleForDriver(driver.id);
              const vehicle=vehicles.find((v:any)=>v.id===vehicleId);
              const summary=getDriverSummary(driver.id,driver);
              return<tr key={driver.id} className="hover:bg-muted/10 transition-colors">
                <td className="sticky left-0 z-10 bg-card border border-gray-200 px-3 py-2 min-w-[180px]">
                  <p className="font-semibold text-sm">{driver.full_name}</p>
                  <p className="text-xs text-muted-foreground">{driver.driver_type==="renta"?"Renta":"Vlastito"}</p>
                  {vehicle?<Badge variant="secondary" className="font-mono text-xs mt-0.5">{vehicle.taxi_license_number}</Badge>:<span className="text-xs text-amber-600">— nije zadužen</span>}
                </td>
                {days.map(day=>{
                  const dow=getDow(year,month,day);const dateStr=getDateStr(year,month,day);
                  const isSun=dow===0;
                  const sunFree=isSun?isSundayFree(cal.entries,driver.id,dateStr):false;
                  const totalAmount=cal.getAmounts(driver.id,dateStr).reduce((s:number,e:any)=>s+e.amount,0);
                  return<Cell key={day}
                    status={cal.getStatus(driver.id,dateStr) as DayStatus}
                    isSun={isSun} sunFree={sunFree} totalAmount={totalAmount}
                    hasAssignment={!!vehicleId}
                    onClick={()=>{setModalDriver(driver);setModalDate(dateStr);setModalOpen(true);}}/>;
                })}
                <td className="sticky right-0 z-10 bg-card border border-gray-200 px-3 py-2 text-right min-w-[130px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Uplaćeno:</span><span className="text-green-600 font-bold">{fmt(summary.uplaceno)}</span></div>
                    <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Duguje:</span><span className={`font-bold ${summary.duguje>0?"text-red-500":"text-muted-foreground"}`}>{summary.duguje>0?fmt(summary.duguje):"—"}</span></div>
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      <DetailModal open={modalOpen} onClose={()=>setModalOpen(false)} driver={modalDriver} date={modalDate} cal={cal} currentUser={displayName}
        vehicle={modalDriver?vehicles.find((v:any)=>v.id===monthlyAssignments.getVehicleForDriver(modalDriver.id)):null}/>
      <AssignModal open={assignOpen} onClose={()=>setAssignOpen(false)} year={year} month={month} drivers={drivers} vehicles={vehicles} monthlyAssignments={monthlyAssignments} currentUser={displayName}/>
    </div>
  );
};
export default CalendarPage;
