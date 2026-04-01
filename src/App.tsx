import { useCallback, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import {
  EmotionWheel,
  type EmotionWheelHandle,
} from '@/components/EmotionWheel'
import { fetchDictionaryEntry } from '@/lib/dictionary'
import type { WheelSegment } from '@/lib/emotionTree'

function App() {
  const wheelRef = useRef<EmotionWheelHandle>(null)
  const [selected, setSelected] = useState<WheelSegment | null>(null)

  const lookupWord = selected?.label ?? ''

  const {
    data: dictionary,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['dictionary', lookupWord],
    queryFn: ({ signal }) => fetchDictionaryEntry(lookupWord, signal),
    enabled: Boolean(lookupWord),
  })

  const onSelect = useCallback((seg: WheelSegment) => {
    setSelected(seg)
  }, [])

  return (
    <Box minH="100dvh" py={{ base: 6, md: 10 }} px={4} color="fg">
      <Stack gap={8} maxW="1100px" mx="auto">
        <Stack gap={1} textAlign={{ base: 'center', md: 'left' }}>
          <Heading size="xl" fontWeight="semibold">
            Emotion wheel
          </Heading>
          <Text color="fg.muted">
            Click any ring to choose an emotion, or spin for a random one.
            Definitions come from the Free Dictionary API.
          </Text>
        </Stack>

        <Flex
          gap={{ base: 8, lg: 12 }}
          align="flex-start"
          justify="center"
          flexDir={{ base: 'column', lg: 'row' }}
        >
          <Stack align="center" gap={4} flex="0 0 auto" color="fg">
            <EmotionWheel
              ref={wheelRef}
              selectedId={selected?.id ?? null}
              onSelect={onSelect}
            />
            <Button
              colorPalette="blue"
              size="lg"
              onClick={() => wheelRef.current?.spin()}
            >
              Spin
            </Button>
          </Stack>

          <Card.Root flex="1" minW={{ base: '100%', lg: '280px' }} variant="outline">
            <Card.Header>
              <Card.Title>
                {selected ? selected.label : 'Pick an emotion'}
              </Card.Title>
              {selected && (
                <Text fontSize="sm" color="fg.muted" fontWeight="normal">
                  {selected.path.join(' → ')}
                </Text>
              )}
            </Card.Header>
            <Card.Body>
              {!selected && (
                <Text color="fg.muted">
                  Select a segment on the wheel or tap Spin.
                </Text>
              )}
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
                    : 'Could not load definition.'}
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
                    <Text fontSize="xs" color="fg.muted" textTransform="capitalize">
                      {dictionary.partOfSpeech}
                    </Text>
                  )}
                  <Text>{dictionary.definition}</Text>
                </Stack>
              )}
            </Card.Body>
          </Card.Root>
        </Flex>
      </Stack>
    </Box>
  )
}

export default App
