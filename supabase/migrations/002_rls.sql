-- RLS: profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- RLS: albums (public read)
create policy "Albums are publicly readable"
  on public.albums for select using (true);

-- RLS: sticker_categories (public read)
create policy "Sticker categories are publicly readable"
  on public.sticker_categories for select using (true);

-- RLS: stickers (public read)
create policy "Stickers are publicly readable"
  on public.stickers for select using (true);

-- RLS: collections
-- Collections are publicly readable by ID (enables compare/QR trade feature)
create policy "Collections are publicly readable"
  on public.collections for select
  using (true);

create policy "Users can insert their own collections"
  on public.collections for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their collections"
  on public.collections for update
  using (auth.uid() = owner_id);

create policy "Owners can delete their collections"
  on public.collections for delete
  using (auth.uid() = owner_id);

-- RLS: collection_collaborators
create policy "Collection members can view collaborators"
  on public.collection_collaborators for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (c.owner_id = auth.uid() or exists (
          select 1 from public.collection_collaborators cc2
          where cc2.collection_id = collection_id and cc2.user_id = auth.uid()
        ))
    )
  );

create policy "Owners can manage collaborators"
  on public.collection_collaborators for insert
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
  );

create policy "Owners can remove collaborators"
  on public.collection_collaborators for delete
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

-- RLS: collection_stickers
-- Publicly readable by collection_id (enables compare/QR trade feature)
create policy "Collection stickers are publicly readable"
  on public.collection_stickers for select
  using (true);

create policy "Members with edit can insert stickers"
  on public.collection_stickers for insert
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (
          c.owner_id = auth.uid()
          or exists (
            select 1 from public.collection_collaborators cc
            where cc.collection_id = collection_id
              and cc.user_id = auth.uid()
              and cc.can_edit = true
          )
        )
    )
  );

create policy "Members with edit can update stickers"
  on public.collection_stickers for update
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (
          c.owner_id = auth.uid()
          or exists (
            select 1 from public.collection_collaborators cc
            where cc.collection_id = collection_id
              and cc.user_id = auth.uid()
              and cc.can_edit = true
          )
        )
    )
  );

create policy "Members with edit can delete stickers"
  on public.collection_stickers for delete
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (
          c.owner_id = auth.uid()
          or exists (
            select 1 from public.collection_collaborators cc
            where cc.collection_id = collection_id
              and cc.user_id = auth.uid()
              and cc.can_edit = true
          )
        )
    )
  );
