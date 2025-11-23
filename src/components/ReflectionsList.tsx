"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Subject, Reflection, Test } from "@prisma/client";
import { getSubjectConfig } from "@/lib/subject";
import { Edit } from "lucide-react";

interface ReflectionsListProps {
  reflections: (Reflection & { test: Test })[];
  onReflectionUpdate?: (id: string, updates: Partial<Reflection>) => Promise<void>;
}

export function ReflectionsList({ reflections, onReflectionUpdate }: ReflectionsListProps) {
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);
  const [editFormData, setEditFormData] = useState({
    score: "",
    deviation: "",
    approach: "",
    learning: "",
  });

  const subjects: Subject[] = ["MATH", "JAPANESE", "SCIENCE", "SOCIAL"];

  // テストごとにグループ化
  const groupedByTest = reflections.reduce((acc, reflection) => {
    const testId = reflection.testId;
    if (!acc[testId]) {
      acc[testId] = {
        test: reflection.test,
        reflections: {} as Record<Subject, Reflection | undefined>,
      };
    }
    acc[testId].reflections[reflection.subject] = reflection;
    return acc;
  }, {} as Record<string, { test: Test; reflections: Record<Subject, Reflection | undefined> }>);

  // テストを日付順にソート（新しい順）
  const sortedTests = Object.values(groupedByTest).sort((a, b) => {
    return new Date(b.test.date).getTime() - new Date(a.test.date).getTime();
  });

  const handleEdit = (reflection: Reflection) => {
    setEditingReflection(reflection);
    setEditFormData({
      score: reflection.score?.toString() || "",
      deviation: reflection.deviation?.toString() || "",
      approach: reflection.approach || "",
      learning: reflection.learning || "",
    });
  };

  const handleCloseEditDialog = () => {
    setEditingReflection(null);
    setEditFormData({
      score: "",
      deviation: "",
      approach: "",
      learning: "",
    });
  };

  const handleUpdate = async () => {
    if (!editingReflection || !onReflectionUpdate) return;

    const updates: Partial<Reflection> = {
      score: editFormData.score ? parseInt(editFormData.score) : null,
      deviation: editFormData.deviation ? parseFloat(editFormData.deviation) : null,
      approach: editFormData.approach || null,
      learning: editFormData.learning || null,
    };

    try {
      await onReflectionUpdate(editingReflection.id, updates);
      handleCloseEditDialog();
    } catch (error) {
      console.error("反省更新エラー:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" aria-label="テスト反省一覧">
          テスト反省一覧
        </h2>
      </div>

      {sortedTests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 text-lg">反省が登録されていません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedTests.map(({ test, reflections: testReflections }) => (
            <Card key={test.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {test.name}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({format(new Date(test.date), "yyyy年M月d日", { locale: ja })})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subject) => {
                    const config = getSubjectConfig(subject);
                    const reflection = testReflections[subject];

                    return (
                      <div key={subject} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className={config.bgColor + " " + config.textColor}>
                            {config.label}
                          </Badge>
                          {reflection && onReflectionUpdate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(reflection)}
                              className="h-6 px-2 text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              編集
                            </Button>
                          )}
                        </div>

                        {!reflection ? (
                          <div className="text-sm text-gray-500">反省が記録されていません</div>
                        ) : (
                          <div className="space-y-2">
                            {(reflection.score || reflection.deviation) && (
                              <div className="flex gap-4 text-sm">
                                {reflection.score && (
                                  <span className="font-medium">点数: {reflection.score}</span>
                                )}
                                {reflection.deviation && (
                                  <span className="font-medium">偏差値: {reflection.deviation}</span>
                                )}
                              </div>
                            )}

                            {reflection.approach && (
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">
                                  観点①: テストの受け方
                                </div>
                                <div className="text-sm bg-gray-50 p-2 rounded whitespace-pre-wrap">
                                  {reflection.approach}
                                </div>
                              </div>
                            )}

                            {reflection.learning && (
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">
                                  観点②: 学習内容
                                </div>
                                <div className="text-sm bg-gray-50 p-2 rounded whitespace-pre-wrap">
                                  {reflection.learning}
                                </div>
                              </div>
                            )}

                            {!reflection.score && !reflection.deviation && !reflection.approach && !reflection.learning && (
                              <div className="text-sm text-gray-500">データがありません</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 編集ダイアログ */}
      {editingReflection && (
        <Dialog open={editingReflection !== null} onOpenChange={handleCloseEditDialog}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>反省を編集</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-score">点数</Label>
                  <Input
                    id="edit-score"
                    type="number"
                    value={editFormData.score}
                    onChange={(e) => setEditFormData({ ...editFormData, score: e.target.value })}
                    placeholder="例: 85"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-deviation">偏差値</Label>
                  <Input
                    id="edit-deviation"
                    type="number"
                    value={editFormData.deviation}
                    onChange={(e) => setEditFormData({ ...editFormData, deviation: e.target.value })}
                    placeholder="例: 65.2"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-approach">観点①: テストの受け方</Label>
                <Textarea
                  id="edit-approach"
                  value={editFormData.approach}
                  onChange={(e) => setEditFormData({ ...editFormData, approach: e.target.value })}
                  placeholder="時間配分、見直しの方法、緊張の対処法など"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-learning">観点②: 学習内容</Label>
                <Textarea
                  id="edit-learning"
                  value={editFormData.learning}
                  onChange={(e) => setEditFormData({ ...editFormData, learning: e.target.value })}
                  placeholder="理解できなかった分野、復習が必要な内容など"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseEditDialog}>
                  キャンセル
                </Button>
                <Button onClick={handleUpdate}>
                  更新
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
