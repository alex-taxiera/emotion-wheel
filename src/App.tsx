import { useCallback, useRef, useState } from "react";
import { Box, Button, Heading, IconButton, VStack } from "@chakra-ui/react";
import { LuGithub } from "react-icons/lu";
import {
  EmotionWheel,
  type EmotionWheelHandle,
} from "@/components/EmotionWheel";
import { WordDialog } from "@/components/WordDialog";
import type { WheelSegment } from "@/lib/emotionTree";
import { GITHUB_REPO_URL } from "@/lib/site";
import { ColorModeButton } from "./components/ui/color-mode";

function App() {
  const wheelRef = useRef<EmotionWheelHandle>(null);
  const [selected, setSelected] = useState<WheelSegment | null>(null);

  const handleSpin = useCallback(() => {
    setSelected(null);
    wheelRef.current?.spin();
  }, []);

  return (
    <Box minH="100dvh" pt={{ base: 3, md: 6 }} pb={2} px={4} color="fg">
      <VStack gap={4} maxW="800px" mx="auto">
        <VStack gap={1}>
          <Heading size="xl" fontWeight="semibold">
            Emotion wheel
          </Heading>
          <Button colorPalette="blue" size="xs" onClick={handleSpin}>
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
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <LuGithub />
        </a>
      </IconButton>

      <ColorModeButton position="fixed" bottom={4} right={4} />

      <WordDialog
        onOpenChange={(e) => {
          if (!e.open) setSelected(null);
        }}
        onSpin={handleSpin}
        selected={selected}
      />
    </Box>
  );
}

export default App;
