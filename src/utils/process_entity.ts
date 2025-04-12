import type { Renderer } from "../renderers/renderer.ts";
import type { MessageEntity } from "../types/message_entity.ts";
import type { TextSanitizer } from "./sanitizer_html.ts";
import { renderEntity } from "./render_entity.ts";

/**
 * Processes a single message entity and its surrounding text, applying the specified renderer to format the entity.
 *
 * This function handles both regular and nested entities:
 * - For regular entities, it applies the renderer to the entity text and sanitizes it.
 * - For nested entities (where the next entity starts at the same offset as the current one), it recursively processes the next entity and combines the results.
 */
export function processEntity(
  options: ProcessEntityOption,
): ProcessEntityOutput {
  const { entities, index, renderer, text, textSanitizer } = options;
  const entity = entities[index];
  const nextEntity = entities[index + 1];

  // Extract the text segment that the entity is pointing to.
  const entityText = text.slice(
    entity.offset,
    entity.offset + entity.length,
  );

  // Apply the renderer.
  const { prefix, suffix } = renderEntity({
    renderer,
    entity,
    text: entityText,
  });

  // Process nested or overlapping entities
  let nestedText = "";
  let currentIndex = index + 1;

  while (
    currentIndex < entities.length &&
    entities[currentIndex].offset < entity.offset + entity.length
  ) {
    const nestedEntityResult = processEntity({
      ...options,
      index: currentIndex,
    });

    nestedText += nestedEntityResult.text;
    currentIndex = nestedEntityResult.index + 1;
  }

  // Compute the remaining text after nested entities
  const remainingText = text.slice(
    nestedText
      ? Math.max(...entities.map((e) => e.offset + e.length))
      : entity.offset + entity.length,
    entity.offset + entity.length,
  );

  const escapedText = textSanitizer({ text: remainingText });

  return {
    index: currentIndex - 1,
    text: `${prefix}${nestedText || escapedText}${suffix}`,
    endOfEntity: entity.offset + entity.length,
  };
}

interface ProcessEntityOption {
  entities: MessageEntity[];
  renderer: Renderer;
  textSanitizer: TextSanitizer;
  /**
   * The index of the current entity in the array of entities.
   */
  index: number;
  /**
   * The full text of the message.
   */
  text: string;
}

interface ProcessEntityOutput {
  /**
   * The formatted text including the processed entity.
   */
  text: string;

  /**
   * The updated index in the array of entities after processing the current entity.
   * This can be used to continue processing subsequent entities.
   */
  index: number;

  /**
   * The position in the text where the current entity ends.
   * This indicates the end of the processed entity's text segment.
   */
  endOfEntity: number;
}
