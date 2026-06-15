"use client";

import { useActionState, useMemo, useState } from "react";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type {
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardOptionalBlockId
} from "@/lib/final-card/types";
import { updateFinalPresentationSettingsAction } from "./actions";
import styles from "./manage-page.module.css";

type BlockOption = {
  id: FinalCardOptionalBlockId;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
};

type Props = {
  manageToken: string;
  options: BlockOption[];
  initialLayoutMode: FinalCardMessageLayoutMode;
  initialMediaLayout: FinalCardMessageMediaLayout;
};

type RenderedBlock = {
  id: string;
  label: string;
  description: string;
  removable: boolean;
  disabled?: boolean;
};

const initialState = {
  ok: false,
  message: ""
};

const layoutOptions: Array<{
  id: FinalCardMessageLayoutMode;
  label: string;
  description: string;
}> = [
  {
    id: "grid-2",
    label: 'Сетка "2 на 2"',
    description: "На первом экране видно 4 карточки, дальше можно листать."
  },
  {
    id: "carousel-1",
    label: "Один ряд",
    description: "Карточки идут в одну линию и читаются как лента."
  },
  {
    id: "carousel-2",
    label: "Два ряда",
    description: "Более плотная сетка, когда хочется показать больше поздравлений сразу."
  },
  {
    id: "column-media",
    label: "Колонка + фото",
    description: "Слева идут поздравления, справа закрепляется отдельный фотоблок."
  }
];

const mediaLayoutOptions: Array<{
  id: FinalCardMessageMediaLayout;
  label: string;
}> = [
  { id: "portrait", label: "1 вертикальное фото" },
  { id: "landscape-pair", label: "2 горизонтальных фото" }
];

const canvasBlockMeta: Record<
  string,
  {
    label: string;
    size: "hero" | "medium" | "small" | "messages" | "closing";
    description: string;
    required?: boolean;
  }
> = {
  hero: {
    label: "Обложка",
    size: "hero",
    description: "Первый экран с именем получателя, поводом и общим настроением открытки. Является обязательным.",
    required: true
  },
  summary: {
    label: "Вводный блок",
    size: "medium",
    description: "Коротко объясняет, по какому поводу собрана открытка. Сейчас блок включен в открытку."
  },
  qualities: {
    label: "Качества",
    size: "small",
    description: "Подсвечивает, за что именно любят и ценят человека. Сейчас блок включен в открытку."
  },
  messages: {
    label: "Поздравления",
    size: "messages",
    description: "Главный блок с карточками участников. Является обязательным.",
    required: true
  },
  memories: {
    label: "Моменты / фото",
    size: "medium",
    description: "Дает место под фотографии, подписи и теплые визуальные детали. Сейчас блок включен в открытку."
  },
  quotes: {
    label: "Лучшие фразы",
    size: "small",
    description: "Выносит самые сильные короткие строки из поздравлений. Сейчас блок включен в открытку."
  },
  "ai-summary": {
    label: "Общее поздравление",
    size: "medium",
    description: "Собирает общий голос группы в один сводный аккорд. Сейчас блок включен в открытку."
  },
  closing: {
    label: "Финал",
    size: "closing",
    description: "Завершает открытку и собирает общее ощущение подарка. Является обязательным.",
    required: true
  }
};

const buildCanvasBlocks = (options: BlockOption[], blockState: Record<string, boolean>): RenderedBlock[] => [
  {
    id: "hero",
    label: canvasBlockMeta.hero.label,
    description: canvasBlockMeta.hero.description,
    removable: false
  },
  ...options
    .filter((option) => !option.disabled && blockState[option.id])
    .map((option) => ({
      id: option.id,
      label: option.label,
      description: canvasBlockMeta[option.id].description,
      removable: true,
      disabled: option.disabled
    })),
  {
    id: "messages",
    label: canvasBlockMeta.messages.label,
    description: canvasBlockMeta.messages.description,
    removable: false
  },
  {
    id: "closing",
    label: canvasBlockMeta.closing.label,
    description: canvasBlockMeta.closing.description,
    removable: false
  }
];

export const BlockSettingsForm = ({ manageToken, options, initialLayoutMode, initialMediaLayout }: Props) => {
  const [state, formAction, isPending] = useActionState(updateFinalPresentationSettingsAction, initialState);
  const [layoutMode, setLayoutMode] = useState<FinalCardMessageLayoutMode>(initialLayoutMode);
  const [mediaLayout, setMediaLayout] = useState<FinalCardMessageMediaLayout>(initialMediaLayout);
  const [blockState, setBlockState] = useState<Record<string, boolean>>(
    Object.fromEntries(options.map((option) => [option.id, option.checked]))
  );

  const canvasBlocks = useMemo(() => buildCanvasBlocks(options, blockState), [blockState, options]);
  const currentLayoutLabel = layoutOptions.find((option) => option.id === layoutMode)?.label ?? 'Сетка "2 на 2"';
  const removedOptionalBlocks = options.filter((option) => !blockState[option.id]);

  return (
    <form action={formAction} className={styles.studioForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="layoutMode" value={layoutMode} />
      <input type="hidden" name="mediaLayout" value={mediaLayout} />

      {options.map((option) => (
        <input key={option.id} type="hidden" name={option.id} value={blockState[option.id] ? "on" : ""} />
      ))}

      <section className={styles.studioCanvasCard}>
        <div className={styles.studioCanvasHeader}>
          <div>
            <p className={styles.eyebrowLabel}>Шаг 2</p>
            <h3 className={styles.studioTitle}>Состав открытки</h3>
          </div>
          <div className={styles.studioCanvasBadges}>
            <span className={styles.infoBadge}>{currentLayoutLabel}</span>
          </div>
        </div>

        <div className={styles.canvasPhone}>
          {canvasBlocks.map((block) => (
            <article
              key={block.id}
              className={`${styles.canvasBlock} ${styles[`canvasBlock${canvasBlockMeta[block.id].size}`]}`}
            >
              <div className={styles.canvasBlockHeader}>
                <span>{block.label}</span>
                {block.removable ? (
                  <button
                    type="button"
                    className={styles.blockCardRemove}
                    onClick={() =>
                      setBlockState((current) => ({
                        ...current,
                        [block.id]: false
                      }))
                    }
                    aria-label={`Убрать блок ${block.label}`}
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <p className={styles.canvasBlockDescription}>{block.description}</p>

              {block.id === "messages" ? (
                <div className={styles.messagesCardControls}>
                  <div className={styles.layoutChoiceGrid}>
                    {layoutOptions.map((option) => {
                      const profile = getFinalCardMessageLayoutProfile(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`${styles.layoutChoiceCard} ${layoutMode === option.id ? styles.layoutChoiceCardActive : ""}`}
                          onClick={() => setLayoutMode(option.id)}
                        >
                          <span className={styles.layoutChoiceTitle}>{option.label}</span>
                          <span className={styles.layoutChoiceDescription}>{option.description}</span>
                          <span className={styles.compactOptionMeta}>До {profile.maxChars} символов на карточку</span>
                        </button>
                      );
                    })}
                  </div>

                  {layoutMode === "column-media" ? (
                    <div className={styles.inlineSettingsStack}>
                      <span className={styles.inlineSettingsLabel}>Как выглядит медиаблок рядом:</span>
                      <div className={styles.inlinePillGroup}>
                        {mediaLayoutOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`${styles.inlinePillOption} ${mediaLayout === option.id ? styles.inlinePillOptionActive : ""}`}
                            onClick={() => setMediaLayout(option.id)}
                          >
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.messageLayoutPreview} data-layout={layoutMode}>
                    {layoutMode === "grid-2" ? (
                      <>
                        <span className={styles.messageSlot}>1</span>
                        <span className={styles.messageSlot}>2</span>
                        <span className={styles.messageSlot}>3</span>
                        <span className={styles.messageSlot}>4</span>
                      </>
                    ) : null}

                    {layoutMode === "carousel-1" ? (
                      <>
                        <span className={styles.messageSlotWide}>1</span>
                        <span className={styles.messageSlotWide}>2</span>
                        <span className={styles.messageSlotWide}>3</span>
                        <span className={styles.scrollHint}>↔</span>
                      </>
                    ) : null}

                    {layoutMode === "carousel-2" ? (
                      <>
                        <div className={styles.messageSlotColumn}>
                          <span className={styles.messageSlot}>1</span>
                          <span className={styles.messageSlot}>2</span>
                        </div>
                        <div className={styles.messageSlotColumn}>
                          <span className={styles.messageSlot}>3</span>
                          <span className={styles.messageSlot}>4</span>
                        </div>
                        <span className={styles.scrollHint}>↔</span>
                      </>
                    ) : null}

                    {layoutMode === "column-media" ? (
                      <>
                        <div className={styles.columnMediaMessages}>
                          <span className={styles.messageSlotTall}>1</span>
                          <span className={styles.messageSlotTall}>2</span>
                          <span className={styles.messageSlotTall}>3</span>
                          <span className={styles.messageSlotTall}>4</span>
                        </div>
                        <div className={styles.columnMediaAside}>
                          {mediaLayout === "portrait" ? (
                            <span className={styles.mediaSlotPortrait}>Фото</span>
                          ) : (
                            <>
                              <span className={styles.mediaSlotLandscape}>Фото A</span>
                              <span className={styles.mediaSlotLandscape}>Фото B</span>
                            </>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className={styles.canvasBlockFill} />
              )}
            </article>
          ))}
        </div>

        <div className={styles.restoreZone}>
          <div className={styles.restoreZoneHeader}>
            <h4 className={styles.restoreZoneTitle}>Убранные блоки, которые можно восстановить</h4>
            <p className={styles.controlHint}>
              Если что-то убрали и передумали, блок возвращается отсюда без переходов назад.
            </p>
          </div>

          {removedOptionalBlocks.length === 0 ? (
            <p className={styles.empty}>Сейчас ничего не убрано. Все доступные дополнительные блоки уже в составе открытки.</p>
          ) : (
            <div className={styles.restoreChipList}>
              {removedOptionalBlocks.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.restoreChip} ${option.disabled ? styles.restoreChipDisabled : ""}`}
                  onClick={() =>
                    setBlockState((current) => ({
                      ...current,
                      [option.id]: true
                    }))
                  }
                  disabled={option.disabled}
                >
                  <span className={styles.restoreChipLabel}>Вернуть {option.label}</span>
                  <span className={styles.restoreChipDescription}>
                    {option.disabled ? "Сначала нужен контент для этого блока." : option.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className={styles.editorFooter}>
        <button type="submit" className={styles.button} disabled={isPending}>
          {isPending ? "Сохраняем..." : "Сохранить состав открытки"}
        </button>
        {state.message ? (
          <span className={state.ok ? styles.editorSuccess : styles.editorError}>{state.message}</span>
        ) : null}
      </div>
    </form>
  );
};
