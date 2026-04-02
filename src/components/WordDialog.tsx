import { Dialog, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";

import { fetchDictionaryEntry } from "@/lib/dictionary";

import type { WheelSegment } from "@/lib/emotionTree";

export type WordDialogProps = {
  onOpenChange: (details: { open: boolean }) => void;
  selected: WheelSegment | null;
};

export function WordDialog({ onOpenChange, selected }: WordDialogProps) {
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
                <Text color="fg.muted">Loading definition…</Text>
              </Flex>
            )}
            {selected && isError && (
              <Text color="red.fg">
                {error instanceof Error
                  ? error.message
                  : "Could not load definition."}
              </Text>
            )}
            {selected && !isPending && !isError && dictionary === null && (
              <Text color="fg.muted">
                No dictionary entry found for &ldquo;{lookupWord}&rdquo;.
              </Text>
            )}
            {selected && dictionary && (
              <Stack gap={2}>
                {dictionary.partOfSpeech && (
                  <Text
                    fontSize="xs"
                    color="fg.muted"
                    textTransform="capitalize"
                  >
                    {dictionary.partOfSpeech}
                  </Text>
                )}
                <Text>{dictionary.definition}</Text>
              </Stack>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
