import { AyoCheckbox, AyoInput, AyoLabel, AyoSelect } from '@/components/ayo';

export default { title: 'Primitives / Forms' };

export const InputDefault = () => (
  <div className="grid max-w-sm gap-sp-2">
    <AyoLabel htmlFor="example">Channel name</AyoLabel>
    <AyoInput id="example" placeholder="e.g. Drama" />
  </div>
);

export const InputInvalid = () => (
  <div className="grid max-w-sm gap-sp-2">
    <AyoLabel htmlFor="bad">Channel name</AyoLabel>
    <AyoInput id="bad" invalid defaultValue="bad value" />
    <p className="text-12 text-[color:var(--status-error)]" role="alert">
      Channel name must be alphanumeric.
    </p>
  </div>
);

export const SelectDefault = () => (
  <div className="grid max-w-sm gap-sp-2">
    <AyoLabel htmlFor="lib">Plex library</AyoLabel>
    <AyoSelect id="lib" defaultValue="movies">
      <option value="movies">Movies</option>
      <option value="tv">TV Shows</option>
      <option value="music">Music</option>
    </AyoSelect>
  </div>
);

export const CheckboxDefault = () => (
  <label className="flex items-center gap-sp-2 text-14">
    <AyoCheckbox /> Auto refresh guide
  </label>
);
