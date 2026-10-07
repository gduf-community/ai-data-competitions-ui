import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLocalSqlPreview, parseJoinOn, buildJoinOn, parseValueFromText } from "@/components/admin/sql-console/query-draft";
import { exportResultCsv, exportResultValues, safeSpreadsheetValue } from "@/components/admin/sql-console/export-result";
import type { SqlConsoleQueryDraft, SqlConsoleQueryResult } from "@/lib/admin/sql-console-types";

test("builder retains SELECT/JOIN/WHERE/GROUP/HAVING/ORDER/LIMIT serialization",()=>{
  const query:SqlConsoleQueryDraft={from:"view_one",select:["view_one.col_one","count(*) as total"],joins:[{type:"left",table:"view_two",on:buildJoinOn("view_one.col_one","view_two.col_two")}],where:[{field:"view_one.col_one",operator:"in",value:["中文","a'b"]}],groupBy:["view_one.col_one"],having:[{field:"total",operator:">",value:1}],orderBy:[{field:"total",direction:"desc"}],limit:100};
  assert.equal(buildLocalSqlPreview(query), "SELECT view_one.col_one, count(*) as total\nFROM view_one\nLEFT JOIN view_two ON view_one.col_one = view_two.col_two\nWHERE view_one.col_one IN ('中文', 'a''b')\nGROUP BY view_one.col_one\nHAVING total > 1\nORDER BY total DESC\nLIMIT 100");
  assert.deepEqual(parseJoinOn(query.joins[0].on),{left:"view_one.col_one",right:"view_two.col_two"});
  assert.equal(parseValueFromText(" true "),true);
  assert.equal(parseValueFromText(" 3.25 "),3.25);
  assert.equal(parseValueFromText(" "),null);
});

test("CSV and XLSX use all returned rows and visible columns, preserving spreadsheet types", async()=>{
  const XLSX=await import("xlsx");
  const columns:SqlConsoleQueryResult["columns"]=[{key:"text",label:'中文,"标题"',type:"string"},{key:"n",label:"数字",type:"number"},{key:"b",label:"布尔",type:"boolean"},{key:"nil",label:"空",type:"string"},{key:"hidden",label:"隐藏",type:"string"}];
  const rows=Array.from({length:101},(_,index)=>({text:index===0?'=SUM(1,2)\n"中文"':"第"+index+"行",n:3.25,b:true,nil:null,hidden:"不得导出"}));
  const result={columns,rows,rowCount:150,truncated:true,elapsedMs:1};
  const visible=columns.slice(0,4);
  const csv=exportResultCsv(result,visible);
  assert.ok(csv.startsWith('"中文,""标题""","数字","布尔","空"'));
  assert.ok(csv.includes("'=SUM(1,2)"));
  assert.ok(csv.includes('"第100行"'));
  assert.ok(!csv.includes("不得导出"));
  const values=exportResultValues(result,visible);
  assert.equal(values.length,102);
  assert.deepEqual(values[1].slice(1),[3.25,true,null]);
  const sheet=XLSX.utils.aoa_to_sheet(values);
  assert.equal(sheet.B2.t,"n"); assert.equal(sheet.C2.t,"b"); assert.equal(sheet.A2.t,"s");
  assert.equal(sheet.A2.f,undefined); assert.equal(sheet.D2,undefined);
  assert.equal(sheet['!ref'],"A1:D102");
  for(const text of ["=cmd","+cmd","-cmd","@cmd"," \t=cmd","\r=cmd"])assert.equal(safeSpreadsheetValue(text),"'"+text);
  assert.equal(safeSpreadsheetValue(-5),-5);
  assert.equal(exportResultValues({...result,rows:[]},visible).length,1);
});
