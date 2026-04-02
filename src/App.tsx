import { useCallback, useRef, useState } from "react";
import { Box, Button, Heading, VStack } from "@chakra-ui/react";
import {
  EmotionWheel,
  type EmotionWheelHandle,
} from "@/components/EmotionWheel";
import { WordDialog } from "@/components/WordDialog";
import type { WheelSegment } from "@/lib/emotionTree";
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
