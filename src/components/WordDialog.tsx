import {
  List,
  Skeleton,
  SkeletonText,
  Stack,
  Text,
  type DialogOpenChangeDetails,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";

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
  open: boolean;
  onOpenChange: (details: DialogOpenChangeDetails) => void;
  selected: WheelSegment | null;
};

export function WordDialog({ open, onOpenChange, selected }: WordDialogProps) {
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
    <DialogRoot
      open={open}
      onOpenChange={onOpenChange}
      lazyMount
      unmountOnExit
    >
      <DialogContent maxW="md" w="full" mx={4}>
        <DialogHeader position="relative" pr="14" alignItems="center">
          <DialogTitle textStyle="xl">{selected?.label ?? ""}</DialogTitle>
          {selected && selected.path.length > 1 && (
            <Text fontSize="sm" color="fg.muted" fontWeight="normal">
              {selected.path.join(" → ")}
            </Text>
          )}
          <DialogCloseTrigger aria-label="Close" />
        </DialogHeader>
        <DialogBody>
          {selected && isPending && (
            <Stack gap={4} role="status" aria-label="Loading definitions">
              <Text fontSize="sm" color="fg.muted">
                Loading definitions…
              </Text>
              <Stack gap={4}>
                {[0, 1].map((i) => (
                  <Stack key={i} gap={2} align="stretch">
                    <Skeleton height="3" width="4.5rem" borderRadius="sm" />
                    <SkeletonText noOfLines={i === 0 ? 3 : 2} gap={2} />
                  </Stack>
                ))}
              </Stack>
            </Stack>
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
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
