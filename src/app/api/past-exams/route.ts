import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pastExamSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const pastExams = await prisma.pastExam.findMany({
      where: { userId: session.id },
      orderBy: [
        { schoolName: "asc" },
        { displayOrder: "asc" },
        { year: "desc" },
        { examNumber: "desc" },
      ],
    });

    return NextResponse.json(pastExams);
  } catch (error) {
    console.error("PastExam取得エラー:", error);
    return NextResponse.json(
      { error: "PastExamの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = pastExamSchema.parse(body);

    // displayOrderが指定されていない場合は、同じ学校内の最大値+1000を設定
    let displayOrder = validatedData.displayOrder;
    if (displayOrder === undefined) {
      const sameSchoolExams = await prisma.pastExam.findMany({
        where: {
          userId: session.id,
          schoolName: validatedData.schoolName,
        },
        select: { displayOrder: true },
        orderBy: { displayOrder: 'desc' },
        take: 1,
      });
      const maxOrder = sameSchoolExams.length > 0 ? (sameSchoolExams[0].displayOrder || 0) : 0;
      displayOrder = maxOrder + 1000;
    }

    const pastExam = await prisma.pastExam.create({
      data: {
        ...validatedData,
        displayOrder,
        userId: session.id,
      },
    });

    return NextResponse.json(pastExam, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "入力データが正しくありません", details: error.message },
        { status: 400 }
      );
    }
    
    console.error("PastExam作成エラー:", error);
    return NextResponse.json(
      { error: "PastExamの作成に失敗しました" },
      { status: 500 }
    );
  }
}
