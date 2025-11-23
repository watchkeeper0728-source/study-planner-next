import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reflectionSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = reflectionSchema.partial().parse(body);

    const resolvedParams = await params;
    const reflection = await prisma.reflection.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!reflection) {
      return NextResponse.json({ error: "Reflectionが見つかりません" }, { status: 404 });
    }

    if (reflection.userId !== session.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const updatedReflection = await prisma.reflection.update({
      where: { id: resolvedParams.id },
      data: validatedData,
    });

    return NextResponse.json(updatedReflection);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "入力データが正しくありません", details: error.message },
        { status: 400 }
      );
    }
    
    console.error("Reflection更新エラー:", error);
    return NextResponse.json(
      { error: "Reflectionの更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const resolvedParams = await params;
    const reflection = await prisma.reflection.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!reflection) {
      return NextResponse.json({ error: "Reflectionが見つかりません" }, { status: 404 });
    }

    if (reflection.userId !== session.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    await prisma.reflection.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reflection削除エラー:", error);
    return NextResponse.json(
      { error: "Reflectionの削除に失敗しました" },
      { status: 500 }
    );
  }
}

