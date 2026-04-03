import { useCallback, useRef, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Heading,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuBookMarked, LuGithub, LuRotateCw, LuX } from "react-icons/lu";
import {
  EmotionWheel,
  type EmotionWheelHandle,
} from "@/components/EmotionWheel";
import { WordDialog } from "@/components/WordDialog";
import type { WheelSegment } from "@/lib/emotionTree";
import { GITHUB_REPO_URL } from "@/lib/site";
import { ColorModeButton } from "./components/ui/color-mode";
import { Tooltip } from "./components/ui/tooltip";

function App() {
  const wheelRef = useRef<EmotionWheelHandle>(null);
  const [selected, setSelected] = useState<WheelSegment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSpin = useCallback(() => {
    setSelected(null);
    wheelRef.current?.spin();
  }, []);

  return (
    <Box minH="100dvh" pt={{ base: 3, md: 6 }} pb={2} px={4} color="fg">
      <VStack gap={0} maxW="800px" mx="auto">
        <VStack gap={1}>
          <Heading size="xl" fontWeight="semibold">
            Emotion wheel
          </Heading>
          <HStack alignItems="center" minH="1.2em">
            {selected ? (
              <HStack
                key={selected.id}
                gap={2}
                alignItems="center"
                animationStyle="scale-fade-in"
                animationDuration="0.22s"
                animationTimingFunction="cubic-bezier(0.34, 1.2, 0.64, 1)"
                animationFillMode="backwards"
                transformOrigin="center"
              >
                <Text as="span">{selected.label}</Text>
                <ButtonGroup
                  gap={0}
                  size="2xs"
                  variant="ghost"
                  colorPalette="blue"
                >
                  <Tooltip content="View definitions">
                    <IconButton
                      onClick={() => setDialogOpen(true)}
                      aria-label="View definitions"
                    >
                      <LuBookMarked />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Deselect">
                    <IconButton
                      colorPalette="red"
                      aria-label="Deselect"
                      onClick={() => setSelected(null)}
                    >
                      <LuX />
                    </IconButton>
                  </Tooltip>
                </ButtonGroup>
              </HStack>
            ) : (
              <Text color="fg.muted">&nbsp;</Text>
            )}
          </HStack>
          <Button colorPalette="blue" variant="ghost" size="xs" onClick={handleSpin}>
            <LuRotateCw />
            Spin the Wheel
          </Button>
        </VStack>

        <EmotionWheel
          ref={wheelRef}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </VStack>

      <IconButton
        asChild
        variant="ghost"
        size="sm"
        aria-label="View source on GitHub"
        position="fixed"
        bottom={4}
        left={4}
        css={{
          _icon: {
            width: "5",
            height: "5",
          },
        }}
      >
        <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
          <LuGithub />
        </a>
      </IconButton>

      <ColorModeButton position="fixed" bottom={4} right={4} />

      <WordDialog
        open={dialogOpen}
        onOpenChange={(details) => setDialogOpen(details.open)}
        selected={selected}
      />
    </Box>
  );
}

export default App;
