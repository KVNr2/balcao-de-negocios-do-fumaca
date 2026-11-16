# Catálogo do Albion Online por assunto

Gerado dos arquivos do próprio jogo (pasta `GameData`, versão **1.32.040**, 3.278 arquivos decifrados sem falha). Os nomes em português vêm da tabela de textos do jogo (PT-BR).

## Como usar
- **Para consultar rápido:** abra os `.csv` (separador `;`, UTF-8) no Excel.
- **Para ver tudo de um arquivo, sem perda:** use o `.json` do mesmo assunto (um por arquivo do jogo; atributos viram campos, filhos viram listas com prefixo `_`).
- **Para entender os campos:** `dicionario_de_campos.json` (por arquivo e por tipo de registro: quantos registros, quais atributos, exemplos).
- 863 dos 11.982 itens não têm nome em português na tabela de textos do jogo (exemplos: itens de missão, protótipos, livros não negociáveis). Não verifiquei um a um.

## Assuntos

### 01-itens — Itens

- **Tabela `itens.csv`**: 11.982 linhas. Colunas: id, tipo, tier, encantamento, nome_pt, nome_en, descricao_pt, categoria, sub1, sub2, sub3, slot, peso, valor_item, poder_item, qualidade_max, durabilidade, fama_item, nutricao, pilha_max, liberado_craft, receita, receita_prata, receita_tempo, receita_foco, upgrade_de_anterior.
- `armory.bin` → `01-itens/armory.json` (19 KB): Descrição automática: tagdefinitions (1), settings (1), activities (1).
- `craftingmodifiers.bin` → `01-itens/craftingmodifiers.json` (39 KB): Modificadores de fabricação por local.
- `farmingmodifiers.bin` → `01-itens/farmingmodifiers.json` (49 KB): Modificadores de fazenda por local.
- `itemroles.bin` → `01-itens/itemroles.json` (4 KB): Papéis (funções) de itens.
- `items.bin` → `01-itens/items.json` (8.900 KB): Todos os itens do jogo: equipamentos, armas, consumíveis, recursos, montarias, mobília, diários, skins. Inclui receitas de fabricação e as variantes encantadas (.1 a .4) com o custo de melhoria em runas.
- `legendaryitems.bin` → `01-itens/legendaryitems.json` (10 KB): Configuração dos itens lendários e seus traços.
- `loadouts.bin` → `01-itens/loadouts.json` (1 KB): Descrição automática: settings (1), icons (1), colors (1), presets (1).

### 02-habilidades — Habilidades

- **Tabela `habilidades.csv`**: 9.066 linhas. Colunas: id, tipo, nome_pt, nome_en, descricao_pt, alvo, categoria, uitype, tempo_conjuracao, recarga, energia, alcance, cargas.
- `orbtypes.bin` → `02-habilidades/orbtypes.json` (3 KB): Descrição automática: orbtype (12).
- `spellanimmappings.bin` → `02-habilidades/spellanimmappings.json` (0 KB): Descrição automática: MappingInfo (1).
- `spells.bin` → `02-habilidades/spells.json` (8.106 KB): Habilidades ativas, passivas e alternáveis (inclui as de monstros, efeitos e buffs internos).
- `transformations.bin` → `02-habilidades/transformations.json` (18 KB): Descrição automática: transformation (8), passivetransformation (6).

### 03-monstros — Monstros

- **Tabela `monstros.csv`**: 5.479 linhas. Colunas: id, nome_pt, nome_en, tier, categoria, hostilidade, faccao, hp, armadura, res_magica, resist_cc, dano, tipo_ataque, alcance, velocidade, fama, valor_mob, prata_mod, respawn_min, respawn_max, prefab, comportamento, n_listas_loot.
- **Tabela `monstros_listas_de_loot.csv`**: 25.803 linhas. Colunas: mob, nome_pt, tier, lista_loot, chance.
- `cagedobjects.bin` → `03-monstros/cagedobjects.json` (3 KB): Descrição automática: cagedwisp (3), cagedsmuggler (1), dragonarearunestone (1).
- `dynamichunt.bin` → `03-monstros/dynamichunt.json` (270 KB): Descrição automática: targets (1), globalsettings (1), hunts (1), quests (1).
- `expeditionagents.bin` → `03-monstros/expeditionagents.json` (2 KB): Descrição automática: expeditionagent (5).
- `mobfactions.bin` → `03-monstros/mobfactions.json` (1 KB): Descrição automática: faction (8).
- `mobs.bin` → `03-monstros/mobs.json` (11.202 KB): Todos os monstros: atributos de combate, comportamento, facção, fama, habilidades e listas de loot.
- `randomspawnbehaviors.bin` → `03-monstros/randomspawnbehaviors.json` (1.232 KB): Descrição automática: spawnbehavior (959).
- `worldbosses.bin` → `03-monstros/worldbosses.json` (6 KB): Descrição automática: boss (12).

### 04-loot-e-tesouros — Loot e tesouros

- **Tabela `loot_listas.csv`**: 22.134 linhas. Colunas: lista, grupo, tipo, alvo, nome_pt, quantidade, chance, peso_grupo.
- `loot.bin` → `04-loot-e-tesouros/loot.json` (1.774 KB): Listas de saque (itens, sorteios OR, grupos AND e referências a outras listas).
- `lootchests.bin` → `04-loot-e-tesouros/lootchests.json` (753 KB): Baús de loot e seus pontos de aparição.
- `multirewardobjects.bin` → `04-loot-e-tesouros/multirewardobjects.json` (1 KB): Descrição automática: helldungeonroomshrine (4), helldungeonsoulshrine (1).
- `piledobjects.bin` → `04-loot-e-tesouros/piledobjects.json` (8 KB): Descrição automática: smugglercratepile (9), factionfortressweaponcache (2).
- `rareresourcedistribution.bin` → `04-loot-e-tesouros/rareresourcedistribution.json` (6 KB): Descrição automática: RareResourceDistribution (17).
- `treasuredistribution.bin` → `04-loot-e-tesouros/treasuredistribution.json` (584 KB): Distribuição de tesouros (baús, coletáveis, monstros, trilhas, santuários).
- `treasuredistribution_asia.bin` → `04-loot-e-tesouros/treasuredistribution_asia.json` (584 KB): Descrição automática: GameobjectDistribution (1), TreasureDestinations (1), TreasureLootchests (1), TreasureHarvestables (1), TreasureMobs (1).
- `treasuredistribution_europe.bin` → `04-loot-e-tesouros/treasuredistribution_europe.json` (584 KB): Descrição automática: GameobjectDistribution (1), TreasureDestinations (1), TreasureLootchests (1), TreasureHarvestables (1), TreasureMobs (1).
- `treasures.bin` → `04-loot-e-tesouros/treasures.json` (6 KB): Descrição automática: treasure (7).

### 05-mundo-e-zonas — Mundo e zonas

- **Tabela `templates_indice.csv`**: 1.910 linhas. Colunas: cor, arquivo, nome, tamanho_kb, caminho_unity, limites_editor, pontos_de_mob, nos_de_recurso, predios_de_acao, saidas, imoveis, baus, guardas_fortificacao, zonas_pvp_livre, locais_missao, teleportes.
- **Tabela `zonas.csv`**: 1.427 linhas. Colunas: id, nome_exibicao, tipo, arquivo, habilitada, tier, cod_tipo, cod_bioma, cod_zona, cod_extra, regiao_tempo, local_especial, distrib_recursos_raros, origem, tamanho, n_saidas, n_marcadores, marcadores.
- **Tabela `zonas_saidas.csv`**: 3.223 linhas. Colunas: zona, saida_id, destino, tipo_destino, pos, tipo_estrada.
- `dynamicclusters.bin` → `05-mundo-e-zonas/dynamicclusters.json` (146 KB): Descrição automática: cluster (384).
- `dynamictemplates.bin` → `05-mundo-e-zonas/dynamictemplates.json` (278 KB): Descrição automática: templatemappingpool (1), templatepools (1).
- `minimapgendata.bin` → `05-mundo-e-zonas/minimapgendata.json` (362 KB): Descrição automática: texturesgenerated (1), floodfillpositions (1), templatedata (1), pregeneratedclustertextures (1), overlayoverrides (1).
- `outlandsteleportationportals.bin` → `05-mundo-e-zonas/outlandsteleportationportals.json` (4 KB): Descrição automática: settings (1), destinationselection (1).
- `placeholderspots.bin` → `05-mundo-e-zonas/placeholderspots.json` (8 KB): Descrição automática: Category (2).
- `placeholderspots_asia.bin` → `05-mundo-e-zonas/placeholderspots_asia.json` (6 KB): Descrição automática: Category (2).
- `placeholderspots_europe.bin` → `05-mundo-e-zonas/placeholderspots_europe.json` (5 KB): Descrição automática: Category (2).
- `randomclusterattributes.bin` → `05-mundo-e-zonas/randomclusterattributes.json` (0 KB): Descrição automática: factionsubsets (1), environments (1), flags (1), categories (1).
- `templatemetadata.bin` → `05-mundo-e-zonas/templatemetadata.json` (208 KB): Descrição automática: biome (2).
- `territorytypes.bin` → `05-mundo-e-zonas/territorytypes.json` (13 KB): Descrição automática: AlliancePenaltySettings (1), territorytype (1).
- `tilebiomereferences.bin` → `05-mundo-e-zonas/tilebiomereferences.json` (18 KB): Descrição automática: tileref (23).
- `times.bin` → `05-mundo-e-zonas/times.json` (9 KB): Descrição automática: DateTime (115), Time (13).
- `times_asia.bin` → `05-mundo-e-zonas/times_asia.json` (9 KB): Descrição automática: DateTime (115), Time (12).
- `times_europe.bin` → `05-mundo-e-zonas/times_europe.json` (9 KB): Descrição automática: DateTime (115), Time (14).
- `tunnelsystem.bin` → `05-mundo-e-zonas/tunnelsystem.json` (13 KB): Descrição automática: tunnelexitsettings (1), tunnelexittypes (1), tunnelexitpresets (1), tunnelpresets (1).
- `worldsettings.bin` → `05-mundo-e-zonas/worldsettings.json` (308 KB): Tipos de zona (arquétipos), regras por tipo, ilhas, regiões de tempo e configurações do mapa.
- `worldsettings_asia.bin` → `05-mundo-e-zonas/worldsettings_asia.json` (308 KB): Descrição automática: archetypes (1), clustertypes (1), clustervaluelookups (1), islands (1), timeregions (1).
- `worldsettings_europe.bin` → `05-mundo-e-zonas/worldsettings_europe.json` (308 KB): Descrição automática: archetypes (1), clustertypes (1), clustervaluelookups (1), islands (1), timeregions (1).

### 06-recursos-e-coleta — Recursos e coleta

- **Tabela `recursos_por_tier.csv`**: 491 linhas. Colunas: recurso, resource, tier, item, nome_pt, cargas_por_coleta, respawn_seg, tempo_coleta_seg, exige_ferramenta, cargas_iniciais.
- `carriables.bin` → `06-recursos-e-coleta/carriables.json` (36 KB): Descrição automática: crystal (3), carriablekey (3), wisp (2), siegebanner (2), factionbattlestandard (2).
- `harvestables.bin` → `06-recursos-e-coleta/harvestables.json` (372 KB): Recursos coletáveis: tempos de coleta, recarga, cargas e modificador de ferramenta por diferença de tier.
- `resourcedistpresets.bin` → `06-recursos-e-coleta/resourcedistpresets.json` (362 KB): Descrição automática: preset (748).
- `resourceprefabmappings.bin` → `06-recursos-e-coleta/resourceprefabmappings.json` (574 KB): Descrição automática: mapping (84).

### 07-construcoes-e-territorio — Construções e território

- **Tabela `construcoes.csv`**: 636 linhas. Colunas: id, tipo, tier, nome_pt, descricao_pt, custo_colocar, evolui_para, durabilidade, capacidade_craft, n_itens_craft.
- `buffshrines.bin` → `07-construcoes-e-territorio/buffshrines.json` (14 KB): Descrição automática: Shrine (37).
- `buildings.bin` → `07-construcoes-e-territorio/buildings.json` (1.318 KB): Construções: fabricação, reparo, mercado, mão de obra, portões de castelo.
- `castles.bin` → `07-construcoes-e-territorio/castles.json` (6 KB): Descrição automática: Castle (2).
- `factionfortress.bin` → `07-construcoes-e-territorio/factionfortress.json` (9 KB): Descrição automática: fortressfight (1), fortressguards (1).
- `fortificationguards.bin` → `07-construcoes-e-territorio/fortificationguards.json` (3 KB): Descrição automática: fortificationguardtype (3), factionfortressguardtype (3).
- `hideouts.bin` → `07-construcoes-e-territorio/hideouts.json` (6 KB): Descrição automática: itemrecovery (1), hideout (1).
- `outpost.bin` → `07-construcoes-e-territorio/outpost.json` (10 KB): Descrição automática: outpost (11), guardsetups (1).

### 08-masmorras-e-eventos-pve — Masmorras e eventos PvE

- `corrupteddungeons.bin` → `08-masmorras-e-eventos-pve/corrupteddungeons.json` (3 KB): Descrição automática: globalsettings (1), difficulty (1), corrupteddungeonmaps (1), infamymilestones (1).
- `dragonarea.bin` → `08-masmorras-e-eventos-pve/dragonarea.json` (25 KB): Descrição automática: globalsettings (1), dragonenergy (1), dragonattackevent (1), entrancetypes (1), modes (1).
- `dragonareatemplatemetadata.bin` → `08-masmorras-e-eventos-pve/dragonareatemplatemetadata.json` (7 KB): Descrição automática: template (10), master (1).
- `expeditioncategories.bin` → `08-masmorras-e-eventos-pve/expeditioncategories.json` (8 KB): Descrição automática: expeditioncategory (12).
- `expeditions.bin` → `08-masmorras-e-eventos-pve/expeditions.json` (17 KB): Descrição automática: expedition (31).
- `festivities.bin` → `08-masmorras-e-eventos-pve/festivities.json` (32 KB): Descrição automática: fixedevents (1), automatedevents (1), dailyevents (1), activityhubeventviews (1).
- `helldungeons.bin` → `08-masmorras-e-eventos-pve/helldungeons.json` (12 KB): Descrição automática: globalsettings (1), helldungeonsouldropsetups (1), helldungeonmodes (1), helldungeonmaps (1), helldungeondifficultyleveluimapping (1).
- `helldungeonstemplatemetadata.bin` → `08-masmorras-e-eventos-pve/helldungeonstemplatemetadata.json` (8 KB): Descrição automática: template (20), master (4).
- `hellgate.bin` → `08-masmorras-e-eventos-pve/hellgate.json` (8 KB): Portões do Inferno: modos e mapas.
- `mists.bin` → `08-masmorras-e-eventos-pve/mists.json` (180 KB): Névoas (Mists): modos, mapas, tabelas de facção e pools de recursos.
- `miststemplatemetadata.bin` → `08-masmorras-e-eventos-pve/miststemplatemetadata.json` (56 KB): Descrição automática: template (51), master (23), dungeon (3).
- `randomdungeons.bin` → `08-masmorras-e-eventos-pve/randomdungeons.json` (338 KB): Masmorras aleatórias: dificuldades, durações, saídas e nomes.
- `staticdungeons.bin` → `08-masmorras-e-eventos-pve/staticdungeons.json` (11 KB): Masmorras estáticas e eventos.

### 09-pvp-guerra-e-ligas — PvP, guerra e ligas

- `arena.bin` → `09-pvp-guerra-e-ligas/arena.json` (143 KB): Arenas.
- `arena_asia.bin` → `09-pvp-guerra-e-ligas/arena_asia.json` (142 KB): Descrição automática: arenaregistrationtypes (1), arenacategories (1), arenarules (1), arenasettings (1), arenaseasons (1).
- `arena_europe.bin` → `09-pvp-guerra-e-ligas/arena_europe.json` (142 KB): Descrição automática: arenaregistrationtypes (1), arenacategories (1), arenarules (1), arenasettings (1), arenaseasons (1).
- `crystalleague.bin` → `09-pvp-guerra-e-ligas/crystalleague.json` (562 KB): Liga de Cristal.
- `crystalleague_asia.bin` → `09-pvp-guerra-e-ligas/crystalleague_asia.json` (561 KB): Descrição automática: season (123), ruleset (73), chest (1), exit (1), clusterclosetimeaftermatch (1).
- `crystalleague_europe.bin` → `09-pvp-guerra-e-ligas/crystalleague_europe.json` (561 KB): Descrição automática: season (123), ruleset (73), chest (1), exit (1), clusterclosetimeaftermatch (1).
- `crystalrealmgvg.bin` → `09-pvp-guerra-e-ligas/crystalrealmgvg.json` (2 KB): Descrição automática: reward (1), chest (1), exit (1), clusterclosetimeaftermatch (1).
- `factionwarfare.bin` → `09-pvp-guerra-e-ligas/factionwarfare.json` (49 KB): Guerra de facções: ducados, tipos de zona, objetivos, bônus de PvE.
- `factionwarfareredzoneevent.bin` → `09-pvp-guerra-e-ligas/factionwarfareredzoneevent.json` (6 KB): Descrição automática: redzoneevent (1).
- `factionwarfareredzoneevent_asia.bin` → `09-pvp-guerra-e-ligas/factionwarfareredzoneevent_asia.json` (6 KB): Descrição automática: redzoneevent (1).
- `factionwarfareredzoneevent_europe.bin` → `09-pvp-guerra-e-ligas/factionwarfareredzoneevent_europe.json` (6 KB): Descrição automática: redzoneevent (1).
- `gvgseasons.bin` → `09-pvp-guerra-e-ligas/gvgseasons.json` (427 KB): Temporadas de GvG.
- `gvgseasons_asia.bin` → `09-pvp-guerra-e-ligas/gvgseasons_asia.json` (209 KB): Descrição automática: season (17), seasonwinnerpopup (1).
- `gvgseasons_europe.bin` → `09-pvp-guerra-e-ligas/gvgseasons_europe.json` (156 KB): Descrição automática: season (13), seasonwinnerpopup (1).
- `killemotes.bin` → `09-pvp-guerra-e-ligas/killemotes.json` (3 KB): Descrição automática: globalsettings (1), emotes (1).
- `killtrophy.bin` → `09-pvp-guerra-e-ligas/killtrophy.json` (1 KB): Descrição automática: killtrophy (4), killtrophysettings (1).
- `matchtypes.bin` → `09-pvp-guerra-e-ligas/matchtypes.json` (12 KB): Descrição automática: matchtype (13).
- `personalseasons.bin` → `09-pvp-guerra-e-ligas/personalseasons.json` (24 KB): Descrição automática: personalseason (12), rewardresettime (1).
- `pvpchallenge.bin` → `09-pvp-guerra-e-ligas/pvpchallenge.json` (248 KB): Desafios de PvP.
- `pvpchallenge_asia.bin` → `09-pvp-guerra-e-ligas/pvpchallenge_asia.json` (237 KB): Descrição automática: seasonchallenge (17), mightcategorytemplate (3), pvpchallengeobjectives (1), weeklychallenge (1).
- `pvpchallenge_europe.bin` → `09-pvp-guerra-e-ligas/pvpchallenge_europe.json` (220 KB): Descrição automática: seasonchallenge (13), mightcategorytemplate (3), pvpchallengeobjectives (1), weeklychallenge (1).
- `seasonstatues.bin` → `09-pvp-guerra-e-ligas/seasonstatues.json` (4 KB): Descrição automática: statue (23), dynamicstatue (14).
- `seasonstatues_asia.bin` → `09-pvp-guerra-e-ligas/seasonstatues_asia.json` (4 KB): Descrição automática: statue (23), dynamicstatue (14).
- `seasonstatues_europe.bin` → `09-pvp-guerra-e-ligas/seasonstatues_europe.json` (4 KB): Descrição automática: statue (23), dynamicstatue (14).
- `standings.bin` → `09-pvp-guerra-e-ligas/standings.json` (4 KB): Descrição automática: standing (4).

### 10-progressao-conquistas-e-missoes — Progressão, conquistas e missões

- `achievements.bin` → `10-progressao-conquistas-e-missoes/achievements.json` (1.235 KB): Conquistas e modelos de conquista.
- `albionjournal.bin` → `10-progressao-conquistas-e-missoes/albionjournal.json` (1.491 KB): Diário de Albion (categorias e metas).
- `albionjournalquests.bin` → `10-progressao-conquistas-e-missoes/albionjournalquests.json` (53 KB): Descrição automática: quest (27).
- `hints.bin` → `10-progressao-conquistas-e-missoes/hints.json` (125 KB): Descrição automática: hint (384), texthint (1).
- `localquests.bin` → `10-progressao-conquistas-e-missoes/localquests.json` (24 KB): Descrição automática: localquest (20).
- `lore.bin` → `10-progressao-conquistas-e-missoes/lore.json` (5 KB): Descrição automática: loresnippets (1).
- `progressiontables.bin` → `10-progressao-conquistas-e-missoes/progressiontables.json` (76 KB): Tabelas de progressão.
- `questgiverobjects.bin` → `10-progressao-conquistas-e-missoes/questgiverobjects.json` (5 KB): Descrição automática: questgiverobject (24).
- `questgiverreferences.bin` → `10-progressao-conquistas-e-missoes/questgiverreferences.json` (6 KB): Descrição automática: questgiverobjectreferences (1), questgiversinworld (1).
- `questgivertypes.bin` → `10-progressao-conquistas-e-missoes/questgivertypes.json` (16 KB): Descrição automática: factionquestgivertype (14), questgivertype (12).
- `quests.bin` → `10-progressao-conquistas-e-missoes/quests.json` (126 KB): Missões.
- `surveys.bin` → `10-progressao-conquistas-e-missoes/surveys.json` (0 KB): Descrição automática: .
- `tutorial.bin` → `10-progressao-conquistas-e-missoes/tutorial.json` (8 KB): Descrição automática: state (49), clustergroup (1), travelplanner (1), unlockachievementskippedtutorial (1), startstate (1).

### 11-cosmeticos-e-personagem — Cosméticos e personagem

- `avatars.bin` → `11-cosmeticos-e-personagem/avatars.json` (34 KB): Descrição automática: avatars (1), peraccountavatars (1), avatarrings (1), peraccountavatarrings (1).
- `avatars_asia.bin` → `11-cosmeticos-e-personagem/avatars_asia.json` (34 KB): Descrição automática: avatars (1), peraccountavatars (1), avatarrings (1), peraccountavatarrings (1).
- `characters.bin` → `11-cosmeticos-e-personagem/characters.json` (34 KB): Descrição automática: Races (1), Customizations (1), AvatarToCustomizationPresets (1), Characters (1).
- `emotes.bin` → `11-cosmeticos-e-personagem/emotes.json` (3 KB): Descrição automática: Emote (16).
- `guildlogos.bin` → `11-cosmeticos-e-personagem/guildlogos.json` (13 KB): Descrição automática: Symbols (1), SymbolColors (1), Schemas (1), PredefinedLogos (1), Banners (1).
- `mountskins.bin` → `11-cosmeticos-e-personagem/mountskins.json` (26 KB): Descrição automática: mountcategory (11).
- `mountskins_asia.bin` → `11-cosmeticos-e-personagem/mountskins_asia.json` (26 KB): Descrição automática: mountcategory (11).
- `mountskins_europe.bin` → `11-cosmeticos-e-personagem/mountskins_europe.json` (26 KB): Descrição automática: mountcategory (11).
- `namegenerators.bin` → `11-cosmeticos-e-personagem/namegenerators.json` (113 KB): Descrição automática: namegenerator (45).
- `wardrobe.bin` → `11-cosmeticos-e-personagem/wardrobe.json` (53 KB): Descrição automática: wardrobecategory (7).
- `wardrobe_asia.bin` → `11-cosmeticos-e-personagem/wardrobe_asia.json` (53 KB): Descrição automática: wardrobecategory (7).
- `wardrobe_europe.bin` → `11-cosmeticos-e-personagem/wardrobe_europe.json` (53 KB): Descrição automática: wardrobecategory (7).

### 12-sistema-e-balanceamento — Sistema e balanceamento

- `accessrights.bin` → `12-sistema-e-balanceamento/accessrights.json` (17 KB): Descrição automática: accessclass (15).
- `advertisementpopups.bin` → `12-sistema-e-balanceamento/advertisementpopups.json` (34 KB): Descrição automática: advertisement (153).
- `animationdata.bin` → `12-sistema-e-balanceamento/animationdata.json` (0 KB): Descrição automática: LayerBlendInfos (1).
- `animationtypes.bin` → `12-sistema-e-balanceamento/animationtypes.json` (11 KB): Descrição automática: {http://www.w3.org/2001/XMLSchema}simpleType (9), {http://www.w3.org/2001/XMLSchema}attribute (4).
- `assetvfx.bin` → `12-sistema-e-balanceamento/assetvfx.json` (226 KB): Descrição automática: AssetVfxInfo (600).
- `audio.bin` → `12-sistema-e-balanceamento/audio.json` (398 KB): Descrição automática: WwiseEventInfo (1651), WwiseSwitchInfo (578), WwiseClusterStateOverwrite (88), WwiseGlobalEnvironmentEffect (8), DangerZoneSettings (5).
- `chatsettings.bin` → `12-sistema-e-balanceamento/chatsettings.json` (3 KB): Descrição automática: ChatUi (1), Cooldowns (1).
- `currencies.bin` → `12-sistema-e-balanceamento/currencies.json` (1 KB): Descrição automática: currency (9).
- `eventbasedpopups.bin` → `12-sistema-e-balanceamento/eventbasedpopups.json` (23 KB): Descrição automática: frequencyrules (1), popupqueue (1), popups (1).
- `gamedata.bin` → `12-sistema-e-balanceamento/gamedata.json` (96 KB): Parâmetros gerais do servidor e do cliente (balanceamento).
- `gamedata_asia.bin` → `12-sistema-e-balanceamento/gamedata_asia.json` (96 KB): Descrição automática: RecoveryVault (3), ServerSettings (1), ClientSettings (1), Items (1), Loot (1).
- `gamedata_europe.bin` → `12-sistema-e-balanceamento/gamedata_europe.json` (96 KB): Descrição automática: RecoveryVault (3), ServerSettings (1), ClientSettings (1), Items (1), Loot (1).
- `guildfinder.bin` → `12-sistema-e-balanceamento/guildfinder.json` (0 KB): Descrição automática: settings (1), memberactivitypercentileweighting (1), beginneractivitypercentileweighting (1).
- `guildfinder_asia.bin` → `12-sistema-e-balanceamento/guildfinder_asia.json` (0 KB): Descrição automática: settings (1), memberactivitypercentileweighting (1), beginneractivitypercentileweighting (1).
- `guildfinder_europe.bin` → `12-sistema-e-balanceamento/guildfinder_europe.json` (0 KB): Descrição automática: settings (1), memberactivitypercentileweighting (1), beginneractivitypercentileweighting (1).
- `loginpopups.bin` → `12-sistema-e-balanceamento/loginpopups.json` (5 KB): Descrição automática: loginpopupconsentlist (3).
- `mobilenotifications.bin` → `12-sistema-e-balanceamento/mobilenotifications.json` (0 KB): Descrição automática: schedulednotification (3).
- `moderationpunishmentescalation.bin` → `12-sistema-e-balanceamento/moderationpunishmentescalation.json` (13 KB): Descrição automática: PunishmentReason (28).
- `playerreports.bin` → `12-sistema-e-balanceamento/playerreports.json` (1 KB): Descrição automática: category (4).
- `settings.bin` → `12-sistema-e-balanceamento/settings.json` (0 KB): Descrição automática: setting (15).
- `sockets.bin` → `12-sistema-e-balanceamento/sockets.json` (251 KB): Descrição automática: SocketInfo (425).
- `vfxprefabdata.bin` → `12-sistema-e-balanceamento/vfxprefabdata.json` (69 KB): Descrição automática: vfx (1039).
- `visualevents.bin` → `12-sistema-e-balanceamento/visualevents.json` (0 KB): Descrição automática: visualevent (1).
- `worldbosses_asia.bin` → `12-sistema-e-balanceamento/worldbosses_asia.json` (6 KB): Descrição automática: boss (12).

### 13-textos — Textos (PT-BR, EN, ES)

- **Tabela `textos_pt_en_es.csv`**: 40.408 linhas. Colunas: chave, pt_br, en, es.

## O que ficou de fora (e por quê)

- **localization.bin**: Textos em 15 idiomas (76 MB). Viraram a tabela 13-textos/textos_pt_en_es.csv (40.408 chaves, PT-BR, EN e ES).
- **profanity_*.bin (20 arquivos)**: Listas de palavrões para filtro de chat. Deliberadamente fora do catálogo.
- **cluster/tiles**: Dados de tiles do mapa (49 MB: alturas, colisão, caminhos). Não decodificado; não serve para consulta.
- **cluster/*.cluster (1.204 arquivos)**: Instâncias de zona em XML (referências a templates). O mapa-múndi (cluster/world) já cobre as zonas na tabela zonas.csv.
- **templates/ (1.910 arquivos, 179 MB)**: Mapas-modelo (posição de mobs, recursos, prédios). Entram só como índice com contagens: 05-mundo-e-zonas/templates_indice.csv.

## Limites conhecidos (honestidade)
- A coluna `tier` das zonas vem do nome do arquivo da zona; para cidades ela aparece como 1 mesmo sendo cidades de uso geral. Os códigos `cod_tipo`, `cod_bioma`, `cod_zona` e `cod_extra` são os pedaços do nome do arquivo, sem tradução confirmada (ex.: FR, HL, MN, SW, ST aparecem como biomas, mas o significado exato não foi verificado).
- Habilidades: só 1.701 de 9.066 têm nome em português; as demais são efeitos, buffs e habilidades internas de monstros sem texto próprio.
- Monstros: 4.594 de 5.479 com nome.
- O catálogo reflete os dados do cliente instalado, não necessariamente o que o servidor aplica hoje.
- Receitas: a coluna `receita` mostra a primeira receita de cada item. Itens com mais de uma receita estão completos apenas no JSON.
