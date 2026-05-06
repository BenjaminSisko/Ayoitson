import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AyoBadge,
  AyoButton,
  AyoCard,
  AyoCheckbox,
  AyoInput,
  AyoLabel,
  AyoSelect,
} from '@/components/ayo';
import { apiClient, ApiClientError, FfmpegSettings } from '@/lib/api-client';

type TextSettingKey =
  | 'concatMuxDelay'
  | 'videoEncoder'
  | 'audioEncoder'
  | 'targetResolution'
  | 'errorScreen'
  | 'errorAudio'
  | 'scalingAlgorithm'
  | 'deinterlaceFilter';

type NumberSettingKey =
  | 'threads'
  | 'audioVolumePercent'
  | 'videoBitrate'
  | 'videoBufSize'
  | 'audioBitrate'
  | 'audioBufSize'
  | 'audioSampleRate'
  | 'audioChannels'
  | 'maxFPS';

type BooleanSettingKey =
  | 'addLock'
  | 'logFfmpeg'
  | 'enableFFMPEGTranscoding'
  | 'normalizeVideoCodec'
  | 'normalizeAudioCodec'
  | 'normalizeResolution'
  | 'normalizeAudio'
  | 'disableChannelOverlay'
  | 'disablePreludes';

type SelectOption = {
  value: string;
  label: string;
};

const RESOLUTION_OPTIONS: SelectOption[] = [
  { value: '420x420', label: '420x420 (1:1)' },
  { value: '480x270', label: '480x270 (HD1080/16 16:9)' },
  { value: '576x320', label: '576x320 (18:10)' },
  { value: '640x360', label: '640x360 (nHD 16:9)' },
  { value: '720x480', label: '720x480 (WVGA 3:2)' },
  { value: '800x600', label: '800x600 (SVGA 4:3)' },
  { value: '1024x768', label: '1024x768 (WXGA 4:3)' },
  { value: '1280x720', label: '1280x720 (HD 16:9)' },
  { value: '1920x1080', label: '1920x1080 (FHD 16:9)' },
  { value: '3840x2160', label: '3840x2160 (4K 16:9)' },
];

const MUX_DELAY_OPTIONS: SelectOption[] = [
  { value: '0', label: '0 seconds' },
  { value: '1', label: '1 second' },
  { value: '2', label: '2 seconds' },
  { value: '3', label: '3 seconds' },
  { value: '4', label: '4 seconds' },
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
];

const FPS_OPTIONS: SelectOption[] = [
  { value: '23.976', label: '23.976 fps' },
  { value: '24', label: '24 fps' },
  { value: '25', label: '25 fps' },
  { value: '29.97', label: '29.97 fps' },
  { value: '30', label: '30 fps' },
  { value: '50', label: '50 fps' },
  { value: '59.94', label: '59.94 fps' },
  { value: '60', label: '60 fps' },
  { value: '120', label: '120 fps' },
];

const SCALING_OPTIONS: SelectOption[] = [
  { value: 'bicubic', label: 'bicubic' },
  { value: 'fast_bilinear', label: 'fast_bilinear' },
  { value: 'lanczos', label: 'lanczos' },
  { value: 'spline', label: 'spline' },
];

const DEINTERLACE_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'none' },
  { value: 'bwdif=0', label: 'bwdif send frame' },
  { value: 'bwdif=1', label: 'bwdif send field' },
  { value: 'w3fdif', label: 'w3fdif' },
  { value: 'yadif=0', label: 'yadif send frame' },
  { value: 'yadif=1', label: 'yadif send field' },
];

const ERROR_SCREEN_OPTIONS: SelectOption[] = [
  { value: 'pic', label: 'images/generic-error-screen.png' },
  { value: 'blank', label: 'Blank screen' },
  { value: 'static', label: 'Static' },
  { value: 'testsrc', label: 'Test pattern' },
  { value: 'text', label: 'Detailed error' },
  { value: 'kill', label: 'Stop stream' },
];

const ERROR_AUDIO_OPTIONS: SelectOption[] = [
  { value: 'whitenoise', label: 'White noise' },
  { value: 'sine', label: 'Beep' },
  { value: 'silent', label: 'No audio' },
];

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'FFmpeg settings request failed.';
}

function numberOrUndefined(value: string) {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inputValue(value: unknown) {
  return typeof value === 'undefined' || value === null ? '' : String(value);
}

function optionsWithCurrent(options: SelectOption[], value: string) {
  if (!value || options.some((option) => option.value === value)) {
    return options;
  }
  return [{ value, label: `${value} (current)` }, ...options];
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-sp-3 border-t border-border-subtle pt-sp-4 first:border-t-0 first:pt-0">
      <h4 className="text-14 font-semibold text-text-primary">{title}</h4>
      {children}
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: unknown;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-sp-2">
      <AyoLabel htmlFor={id}>{label}</AyoLabel>
      <AyoInput
        id={id}
        value={inputValue(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  disabled,
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: unknown;
  disabled?: boolean;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-sp-2">
      <AyoLabel htmlFor={id}>{label}</AyoLabel>
      <AyoInput
        id={id}
        type="number"
        min={min}
        value={inputValue(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  disabled,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: unknown;
  disabled?: boolean;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const stringValue = inputValue(value);
  const visibleOptions = optionsWithCurrent(options, stringValue);

  return (
    <div className="grid gap-sp-2">
      <AyoLabel htmlFor={id}>{label}</AyoLabel>
      <AyoSelect
        id={id}
        value={stringValue}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {visibleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </AyoSelect>
    </div>
  );
}

function CheckboxField({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-9 items-center gap-sp-2 text-14 text-text-primary"
    >
      <AyoCheckbox
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function FfmpegPane() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FfmpegSettings>({});

  const settings = useQuery({
    queryKey: ['settings', 'ffmpeg'],
    queryFn: apiClient.getFfmpegSettings,
  });

  useEffect(() => {
    if (settings.data) {
      setDraft(settings.data);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => apiClient.updateFfmpegSettings(draft),
    onSuccess: (result) => {
      setDraft(result);
      queryClient.invalidateQueries({ queryKey: ['settings', 'ffmpeg'] });
    },
  });

  const reset = useMutation({
    mutationFn: apiClient.resetFfmpegSettings,
    onSuccess: (result) => {
      setDraft(result);
      queryClient.invalidateQueries({ queryKey: ['settings', 'ffmpeg'] });
    },
  });

  const transcodingEnabled = Boolean(draft.enableFFMPEGTranscoding);
  const pathLocked = Boolean(draft.lock);
  const busy = save.isPending || reset.isPending;

  const selectValues = useMemo(
    () => ({
      concatMuxDelay: inputValue(draft.concatMuxDelay),
      targetResolution: inputValue(draft.targetResolution),
      maxFPS: inputValue(draft.maxFPS),
      scalingAlgorithm: inputValue(draft.scalingAlgorithm),
      deinterlaceFilter: inputValue(draft.deinterlaceFilter),
      errorScreen: inputValue(draft.errorScreen),
      errorAudio: inputValue(draft.errorAudio),
    }),
    [draft]
  );

  function setText(key: TextSettingKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setNumber(key: NumberSettingKey, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: numberOrUndefined(value),
    }));
  }

  function setBoolean(key: BooleanSettingKey, checked: boolean) {
    setDraft((current) => ({ ...current, [key]: checked }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <AyoCard>
      <AyoCard.Header>
        <div>
          <AyoCard.Title>FFmpeg</AyoCard.Title>
          <AyoCard.Description>
            Streaming process, transcode, fallback, and normalization defaults.
          </AyoCard.Description>
        </div>
      </AyoCard.Header>
      <AyoCard.Body>
        {settings.isLoading && (
          <AyoBadge tone="neutral">Loading FFmpeg settings.</AyoBadge>
        )}
        {settings.isError && (
          <AyoBadge tone="error">{errorText(settings.error)}</AyoBadge>
        )}
        {settings.isSuccess && (
          <form className="grid max-w-6xl gap-sp-5" onSubmit={submit}>
            <SettingsSection title="Executable">
              <div className="grid gap-sp-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
                <TextField
                  id="ffmpeg-path"
                  label="FFmpeg path"
                  value={draft.ffmpegPath}
                  disabled={pathLocked}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      ffmpegPath: value,
                    }))
                  }
                />
                {!pathLocked && (
                  <CheckboxField
                    id="ffmpeg-add-lock"
                    label="Lock FFmpeg path setting"
                    checked={Boolean(draft.addLock)}
                    onChange={(checked) => setBoolean('addLock', checked)}
                  />
                )}
                {pathLocked && (
                  <AyoBadge
                    tone="neutral"
                    className="self-end justify-self-start lg:self-center"
                  >
                    FFmpeg path is locked.
                  </AyoBadge>
                )}
              </div>
            </SettingsSection>

            <SettingsSection title="Runtime">
              <div className="grid gap-sp-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  id="ffmpeg-threads"
                  label="Threads"
                  value={draft.threads}
                  min="1"
                  onChange={(value) => setNumber('threads', value)}
                />
                <SelectField
                  id="ffmpeg-mux-delay"
                  label="Video buffer"
                  value={selectValues.concatMuxDelay}
                  options={MUX_DELAY_OPTIONS}
                  onChange={(value) => setText('concatMuxDelay', value)}
                />
                <CheckboxField
                  id="ffmpeg-log"
                  label="Log FFmpeg to console"
                  checked={Boolean(draft.logFfmpeg)}
                  onChange={(checked) => setBoolean('logFfmpeg', checked)}
                />
              </div>
            </SettingsSection>

            <SettingsSection title="Transcoding">
              <div className="grid gap-sp-4">
                <CheckboxField
                  id="ffmpeg-transcoding"
                  label="Enable FFmpeg transcoding"
                  checked={transcodingEnabled}
                  onChange={(checked) =>
                    setBoolean('enableFFMPEGTranscoding', checked)
                  }
                />
                <div className="grid gap-sp-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SelectField
                    id="ffmpeg-resolution"
                    label="Preferred resolution"
                    value={selectValues.targetResolution}
                    disabled={!transcodingEnabled}
                    options={RESOLUTION_OPTIONS}
                    onChange={(value) => setText('targetResolution', value)}
                  />
                  <TextField
                    id="ffmpeg-video-encoder"
                    label="Video encoder"
                    value={draft.videoEncoder}
                    disabled={!transcodingEnabled}
                    onChange={(value) => setText('videoEncoder', value)}
                  />
                  <TextField
                    id="ffmpeg-audio-encoder"
                    label="Audio encoder"
                    value={draft.audioEncoder}
                    disabled={!transcodingEnabled}
                    onChange={(value) => setText('audioEncoder', value)}
                  />
                </div>
                <div className="grid gap-sp-4 sm:grid-cols-2 lg:grid-cols-3">
                  <NumberField
                    id="ffmpeg-video-bitrate"
                    label="Video bitrate (k)"
                    value={draft.videoBitrate}
                    disabled={!transcodingEnabled}
                    min="0"
                    onChange={(value) => setNumber('videoBitrate', value)}
                  />
                  <NumberField
                    id="ffmpeg-video-buffer-size"
                    label="Video buffer size (k)"
                    value={draft.videoBufSize}
                    disabled={!transcodingEnabled}
                    min="0"
                    onChange={(value) => setNumber('videoBufSize', value)}
                  />
                  <SelectField
                    id="ffmpeg-max-fps"
                    label="Max frame rate"
                    value={selectValues.maxFPS}
                    disabled={!transcodingEnabled}
                    options={FPS_OPTIONS}
                    onChange={(value) => setNumber('maxFPS', value)}
                  />
                  <SelectField
                    id="ffmpeg-scaling"
                    label="Scaling algorithm"
                    value={selectValues.scalingAlgorithm}
                    disabled={!transcodingEnabled}
                    options={SCALING_OPTIONS}
                    onChange={(value) => setText('scalingAlgorithm', value)}
                  />
                  <SelectField
                    id="ffmpeg-deinterlace"
                    label="Deinterlace filter"
                    value={selectValues.deinterlaceFilter}
                    disabled={!transcodingEnabled}
                    options={DEINTERLACE_OPTIONS}
                    onChange={(value) => setText('deinterlaceFilter', value)}
                  />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Audio">
              <div className="grid gap-sp-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  id="ffmpeg-audio-bitrate"
                  label="Audio bitrate (k)"
                  value={draft.audioBitrate}
                  disabled={!transcodingEnabled}
                  min="0"
                  onChange={(value) => setNumber('audioBitrate', value)}
                />
                <NumberField
                  id="ffmpeg-audio-buffer-size"
                  label="Audio buffer size (k)"
                  value={draft.audioBufSize}
                  disabled={!transcodingEnabled}
                  min="0"
                  onChange={(value) => setNumber('audioBufSize', value)}
                />
                <NumberField
                  id="ffmpeg-audio-volume"
                  label="Audio volume (%)"
                  value={draft.audioVolumePercent}
                  disabled={!transcodingEnabled}
                  min="0"
                  onChange={(value) => setNumber('audioVolumePercent', value)}
                />
                <NumberField
                  id="ffmpeg-audio-channels"
                  label="Audio channels"
                  value={draft.audioChannels}
                  disabled={!transcodingEnabled}
                  min="1"
                  onChange={(value) => setNumber('audioChannels', value)}
                />
                <NumberField
                  id="ffmpeg-audio-sample-rate"
                  label="Audio sample rate (k)"
                  value={draft.audioSampleRate}
                  disabled={!transcodingEnabled}
                  min="1"
                  onChange={(value) => setNumber('audioSampleRate', value)}
                />
              </div>
            </SettingsSection>

            <SettingsSection title="Fallback">
              <div className="grid gap-sp-4 sm:grid-cols-2">
                <SelectField
                  id="ffmpeg-error-screen"
                  label="Error screen"
                  value={selectValues.errorScreen}
                  disabled={!transcodingEnabled}
                  options={ERROR_SCREEN_OPTIONS}
                  onChange={(value) => setText('errorScreen', value)}
                />
                <SelectField
                  id="ffmpeg-error-audio"
                  label="Error audio"
                  value={selectValues.errorAudio}
                  disabled={!transcodingEnabled}
                  options={ERROR_AUDIO_OPTIONS}
                  onChange={(value) => setText('errorAudio', value)}
                />
              </div>
            </SettingsSection>

            <SettingsSection title="Normalization">
              <div className="grid gap-sp-3 sm:grid-cols-2 lg:grid-cols-3">
                <CheckboxField
                  id="ffmpeg-normalize-resolution"
                  label="Normalize resolution"
                  checked={Boolean(draft.normalizeResolution)}
                  disabled={!transcodingEnabled}
                  onChange={(checked) =>
                    setBoolean('normalizeResolution', checked)
                  }
                />
                <CheckboxField
                  id="ffmpeg-normalize-video-codec"
                  label="Normalize video codec"
                  checked={Boolean(draft.normalizeVideoCodec)}
                  disabled={!transcodingEnabled}
                  onChange={(checked) =>
                    setBoolean('normalizeVideoCodec', checked)
                  }
                />
                <CheckboxField
                  id="ffmpeg-normalize-audio-codec"
                  label="Normalize audio codec"
                  checked={Boolean(draft.normalizeAudioCodec)}
                  disabled={!transcodingEnabled}
                  onChange={(checked) =>
                    setBoolean('normalizeAudioCodec', checked)
                  }
                />
                <CheckboxField
                  id="ffmpeg-normalize-audio"
                  label="Normalize audio"
                  checked={Boolean(draft.normalizeAudio)}
                  disabled={!transcodingEnabled}
                  onChange={(checked) => setBoolean('normalizeAudio', checked)}
                />
                <CheckboxField
                  id="ffmpeg-disable-watermark"
                  label="Disable channel watermark globally"
                  checked={Boolean(draft.disableChannelOverlay)}
                  disabled={!transcodingEnabled}
                  onChange={(checked) =>
                    setBoolean('disableChannelOverlay', checked)
                  }
                />
                <CheckboxField
                  id="ffmpeg-disable-preludes"
                  label="Disable preludes"
                  checked={Boolean(draft.disablePreludes)}
                  disabled={!transcodingEnabled}
                  onChange={(checked) => setBoolean('disablePreludes', checked)}
                />
              </div>
            </SettingsSection>

            <div className="flex flex-wrap items-center gap-sp-3 border-t border-border-subtle pt-sp-4">
              <AyoButton type="submit" variant="primary" disabled={busy}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save
              </AyoButton>
              <AyoButton
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => reset.mutate()}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset options
              </AyoButton>
              {save.isError && (
                <AyoBadge tone="error">{errorText(save.error)}</AyoBadge>
              )}
              {reset.isError && (
                <AyoBadge tone="error">{errorText(reset.error)}</AyoBadge>
              )}
              {save.isSuccess && <AyoBadge tone="success">Saved.</AyoBadge>}
              {reset.isSuccess && <AyoBadge tone="success">Reset.</AyoBadge>}
            </div>
          </form>
        )}
      </AyoCard.Body>
    </AyoCard>
  );
}
