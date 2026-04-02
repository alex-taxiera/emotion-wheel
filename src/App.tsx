import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import {
  EmotionWheel,
  type EmotionWheelHandle,
} from "@/components/EmotionWheel";
import { fetchDictionaryEntry } from "@/lib/dictionary";
import type { WheelSegment } from "@/lib/emotionTree";
import { ColorModeButton } from "./components/ui/color-mode";

function App() {
  const wheelRef = useRef<EmotionWheelHandle>(null);
  const [selected, setSelected] = useState<WheelSegment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const onSelect = useCallback((seg: WheelSegment) => {
    setSelected(seg);
    setDetailsOpen(true);
  }, []);

  return (
    <Box minH="100dvh" pt={{ base: 3, md: 6 }} pb={2} px={4} color="fg">
      <VStack gap={4} maxW="800px" mx="auto">
        <VStack gap={1}>
          <Heading size="xl" fontWeight="semibold">
            Emotion wheel
          </Heading>
          <Text color="fg.muted">
            Click any ring or spin for a random emotion.
          </Text>
          <Button
            colorPalette="blue"
            variant="plain"
            size="lg"
            onClick={() => {
              setSelected(null);
              setDetailsOpen(false);
              wheelRef.current?.spin();
            }}
          >
            Spin the Wheel
          </Button>
        </VStack>

        <EmotionWheel
          ref={wheelRef}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
        />
      </VStack>

      <ColorModeButton position="fixed" bottom={4} right={4} />

      <Dialog.Root
        open={detailsOpen && Boolean(selected)}
        onOpenChange={(e) => {
          setDetailsOpen(e.open);
          if (!e.open) setSelected(null);
        }}
        lazyMount
        unmountOnExit
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md" w="full" mx={4}>
            <Dialog.Header position="relative" pr="14">
              <Dialog.Title textStyle="xl">
                {selected?.label ?? ""}
              </Dialog.Title>
              {selected && (
                <Text fontSize="sm" color="fg.muted" fontWeight="normal" mt={1}>
                  {selected.path.join(" → ")}
                </Text>
              )}
              <Dialog.CloseTrigger
                position="absolute"
                top="2"
                insetEnd="2"
                rounded="full"
                aria-label="Close"
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
    </Box>
  );
}

export default App;
