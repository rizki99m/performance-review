import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/server/db";
import { createSession } from "@/lib/server/auth";
export async function POST(request:Request){try{const{username,password}=await request.json();const rows=await db()`SELECT id::text,name,position,username,password_hash,role,status FROM users WHERE LOWER(username)=LOWER(${String(username).trim()}) LIMIT 1`;const user=rows[0];if(!user||user.status!=="ACTIVE"||!await compare(String(password),String(user.password_hash)))return NextResponse.json({error:"Invalid username or password, or this account is inactive."},{status:401});await createSession(String(user.id));return NextResponse.json({user:{id:String(user.id),name:user.name,position:user.position,username:user.username,role:user.role,status:user.status}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Login failed."},{status:500})}}
