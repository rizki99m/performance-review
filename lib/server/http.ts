import { NextResponse } from "next/server";
import { ApiError } from "./auth";

type DatabaseError = Error & { code?: string; constraint?: string };
export function errorResponse(error:unknown,fallback:string){
  if(error instanceof ApiError)return NextResponse.json({error:error.message},{status:error.status});
  const dbError=error as DatabaseError;
  if(dbError.code==="23505")return NextResponse.json({error:"Data yang sama sudah pernah diinput."},{status:409});
  if(dbError.code==="23503")return NextResponse.json({error:"Data terkait tidak ditemukan atau masih digunakan."},{status:400});
  if(dbError.code==="23514"||dbError.code==="22007")return NextResponse.json({error:"Data yang diisi belum valid. Periksa kembali semua field."},{status:400});
  const safeMessages=["Password is required.","Please answer all questions before submitting.","This review is not editable at this time.","Review assignment not found.","Semua field wajib diisi.","End Date harus setelah Start Date.","Pilih minimal satu peserta.","Question tidak ditemukan atau sudah dihapus.","Review tidak ditemukan atau sudah dihapus."];
  const message=error instanceof Error&&safeMessages.includes(error.message)?error.message:fallback;
  return NextResponse.json({error:message},{status:400});
}
