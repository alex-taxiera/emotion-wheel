import {
  Button,
  Dialog,
  Flex,
  List,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";

import {
  fetchDictionaryEntry,
  type DictionarySense,
} from "@/lib/dictionary";

import type { WheelSegment } from "@/lib/emotionTree";

function groupSensesByPartOfSpeech(senses: DictionarySense[]) {
  const groups: { pos: string; defs: string[] }[] = [];
  for (const s of senses) {
    const pos = s.partOfSpeech || "other";
    const last = groups[groups.length - 1];
    if (last && last.pos === pos) last.defs.push(s.definition);
    else groups.push({ pos, defs: [s.definition] });
  }
  return groups;
}

export type WordDialogProps = {
  onOpenChange: (details: { open: boolean }) => void;
  onSpin: () => void;
  selected: WheelSegment | null;
};

export function WordDialog({ onOpenChange, onSpin, selected }: WordDialogProps) {
  const lookupWord = selected?.label ?? "";

  const {
    data: dictionary,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["dictionary", lookupWord],
    queryFn: ({ signal }) => fetchDictionaryEntry(lookupWord, signal),
    enabled: Boolean(lookupWord),
  });
  return (
    <Dialog.Root
      open={Boolean(selected)}
      onOpenChange={onOpenChange}
      lazyMount
      unmountOnExit
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="md" w="full" mx={4}>
          <Dialog.Header position="relative" pr="14" alignItems="center">
            <Dialog.Title textStyle="xl">{selected?.label ?? ""}</Dialog.Title>
            {selected && selected.path.length > 1 && (
              <Text fontSize="sm" color="fg.muted" fontWeight="normal">
                {selected.path.join(" → ")}
              </Text>
            )}
            <Dialog.CloseTrigger
              position="absolute"
              top="2"
              insetEnd="2"
              rounded="full"
              aria-label="Close"
              cursor="pointer"
            >
              <LuX size={18} />
            </Dialog.CloseTrigger>
          </Dialog.Header>
          <Dialog.Body>
            {selected && isPending && (
              <Flex align="center" gap={3}>
                <Spinner size="sm" />
                <Text color="fg.muted">Loading definitions…</Text>
              </Flex>
            )}
            {selected && isError && (
              <Text color="red.fg">
                {error instanceof Error
                  ? error.message
                  : "Could not load definitions."}
              </Text>
            )}
            {selected && !isPending && !isError && dictionary === null && (
              <Text color="fg.muted">
                No dictionary entry found for &ldquo;{lookupWord}&rdquo;.
              </Text>
            )}
            {selected && dictionary && dictionary.senses.length > 0 && (
              <Stack gap={4}>
                {groupSensesByPartOfSpeech(dictionary.senses).map(
                  ({ pos, defs }, gi) => (
                    <Stack key={`${pos}-${gi}`} gap={2} align="stretch">
                      <Text
                        fontSize="xs"
                        color="fg.muted"
                        textTransform="capitalize"
                        fontWeight="semibold"
                      >
                        {pos}
                      </Text>
                      <List.Root
                        gap={2}
                        as="ol"
                        pl={4}
                        style={{ listStyleType: "decimal" }}
                      >
                        {defs.map((def, i) => (
                          <List.Item key={i} value={i}>
                            <Text as="span">{def}</Text>
                          </List.Item>
                        ))}
                      </List.Root>
                    </Stack>
                  ),
                )}
              </Stack>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <Button
              colorPalette="blue"
              size="sm"
              variant="outline"
              w="full"
              onClick={onSpin}
            >
              Spin the wheel
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
