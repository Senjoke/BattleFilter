<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Minus, Plus, Send, Eye } from 'lucide-vue-next'

const props = defineProps<{
  state: any
  viewer: 'admin' | 'captain'
  myTeamId?: number | null
  bidAmount?: number
}>()

const emit = defineEmits<{
  (event: 'increaseBid'): void
  (event: 'decreaseBid'): void
  (event: 'submitBid'): void
  (event: 'manualAssign', payload: { registrationId: number; teamId: number }): void
}>()

const selectedTeamByPlayer = ref<Record<number, number | ''>>({})

const teams = computed(() => props.state?.teams || [])
const pool = computed(() => props.state?.pool || [])
const currentPlayer = computed(() => props.state?.currentPlayer || null)
const anonymousMode = computed(() => Boolean(props.state?.anonymousMode))
const currentHighestBid = computed(() => Number(props.state?.currentHighestBid || 0))
const currentHighestTeamName = computed(() => props.state?.currentHighestTeamName || '暂无')
const myTeam = computed(() => teams.value.find((team: any) => team.id === props.myTeamId) || null)
const minimumBid = computed(() => currentHighestBid.value + 1)
const canBid = computed(() => {
  const bid = Number(props.bidAmount || 0)
  return Boolean(
    props.viewer === 'captain' &&
    currentPlayer.value &&
    myTeam.value &&
    myTeam.value.budgetRemaining >= minimumBid.value &&
    bid >= minimumBid.value &&
    bid <= myTeam.value.budgetRemaining
  )
})

watch(pool, (players: any[]) => {
  const activeIds = new Set(players.map(player => player.registrationId))
  Object.keys(selectedTeamByPlayer.value).forEach(key => {
    if (!activeIds.has(Number(key))) {
      delete selectedTeamByPlayer.value[Number(key)]
    }
  })
})

const displayValue = (value: any, fallback = '匿名') => value || fallback

const handleManualAssign = (registrationId: number) => {
  const teamId = selectedTeamByPlayer.value[registrationId]
  if (!teamId) return
  emit('manualAssign', { registrationId, teamId: Number(teamId) })
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="anonymousMode" class="border border-amber-200 bg-amber-50 text-amber-800 rounded-md px-4 py-3 text-sm">
      匿名竞拍模式已开启，最后阶段的选手身份将按角色权限隐藏。
    </div>

    <div :class="viewer === 'admin' ? 'grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-6' : 'grid grid-cols-1 gap-6'">
      <section class="border border-gray-200 rounded-lg bg-white shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">当前拍卖队员</h3>
          <span class="text-sm text-gray-500">最高价：{{ currentHighestBid }} / {{ currentHighestTeamName }}</span>
        </div>

        <div v-if="currentPlayer" class="space-y-5">
          <div class="rounded-md border border-gray-200 bg-gray-50 p-5">
            <div class="text-sm text-gray-500 mb-2">战网 ID</div>
            <div v-if="currentPlayer.masked && viewer === 'admin'" class="group inline-flex items-center gap-2 text-2xl font-bold text-gray-900">
              <span class="group-hover:hidden">匿名选手</span>
              <span class="hidden group-hover:inline">{{ displayValue(currentPlayer.battleTag) }}</span>
              <Eye class="w-5 h-5 text-gray-400" />
            </div>
            <div v-else class="text-2xl font-bold text-gray-900">
              {{ displayValue(currentPlayer.battleTag || currentPlayer.nickname) }}
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-sm">主要职责：{{ displayValue(currentPlayer.primaryRoleLabel, '未填写') }}</span>
              <span class="px-2.5 py-1 rounded bg-gray-100 text-gray-700 text-sm">段位：{{ displayValue(currentPlayer.primaryRank, '未定级') }}</span>
              <span v-if="currentPlayer.passCount" class="px-2.5 py-1 rounded bg-amber-100 text-amber-700 text-sm">流拍 {{ currentPlayer.passCount }} 次</span>
            </div>
          </div>

          <div v-if="viewer === 'captain'" class="rounded-md border border-gray-200 bg-white p-4">
            <div class="flex items-center justify-between mb-3">
              <div>
                <div class="text-sm text-gray-500">准备出价</div>
                <div class="text-3xl font-bold text-gray-900">{{ bidAmount || minimumBid }}</div>
              </div>
              <div class="text-right text-sm text-gray-500">
                <div>最低 {{ minimumBid }}</div>
                <div>剩余 {{ myTeam?.budgetRemaining ?? 0 }}</div>
              </div>
            </div>
            <div class="grid grid-cols-[48px_1fr_48px] gap-3">
              <button @click="emit('decreaseBid')" :disabled="(bidAmount || 0) <= minimumBid" class="h-11 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40">
                <Minus class="w-5 h-5" />
              </button>
              <button @click="emit('submitBid')" :disabled="!canBid" class="h-11 rounded-md bg-blue-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                <Send class="w-4 h-4" />
                确认出价
              </button>
              <button @click="emit('increaseBid')" :disabled="!myTeam || (bidAmount || 0) >= myTeam.budgetRemaining" class="h-11 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40">
                <Plus class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="border-2 border-dashed border-gray-200 rounded-lg p-10 text-center text-gray-500">
          暂无正在拍卖的队员
        </div>
      </section>

      <section v-if="viewer === 'admin'" class="border border-gray-200 rounded-lg bg-white shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">未分配选手池</h3>
          <span class="text-sm text-gray-500">{{ pool.length }} 人</span>
        </div>
        <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
          <div v-for="player in pool" :key="player.registrationId" class="group border border-gray-100 rounded-md bg-gray-50 px-3 py-2">
            <div v-if="player.masked && viewer === 'admin'" class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold text-gray-900">
                  <span class="group-hover:hidden">匿名选手</span>
                  <span class="hidden group-hover:inline">{{ player.battleTag }}</span>
                </div>
                <div class="text-xs text-gray-500">
                  <span class="group-hover:hidden">信息已遮挡</span>
                  <span class="hidden group-hover:inline">{{ player.primaryRoleLabel }} / {{ player.primaryRank }}</span>
                  <span v-if="player.passCount"> · 流拍 {{ player.passCount }} 次</span>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <Eye class="w-4 h-4 text-gray-400" />
                <select v-model="selectedTeamByPlayer[player.registrationId]" class="border border-gray-300 rounded-md text-xs py-1 pl-2 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">选择队伍</option>
                  <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
                </select>
                <button @click="handleManualAssign(player.registrationId)" :disabled="!selectedTeamByPlayer[player.registrationId]" class="px-2 py-1 rounded-md bg-gray-800 text-white text-xs hover:bg-gray-900 disabled:opacity-40">
                  手动分队
                </button>
              </div>
            </div>
            <div v-else>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold text-gray-900 truncate">{{ displayValue(player.battleTag || player.nickname) }}</div>
                  <div class="text-xs text-gray-500">
                    <span v-if="!player.detailsMasked">{{ displayValue(player.primaryRoleLabel, '未填写') }} / {{ displayValue(player.primaryRank, '未定级') }}</span>
                    <span v-else>信息已匿名</span>
                    <span v-if="player.passCount"> · 流拍 {{ player.passCount }} 次</span>
                  </div>
                </div>
                <div v-if="viewer === 'admin'" class="flex items-center gap-2 flex-shrink-0">
                  <select v-model="selectedTeamByPlayer[player.registrationId]" class="border border-gray-300 rounded-md text-xs py-1 pl-2 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">选择队伍</option>
                    <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
                  </select>
                  <button @click="handleManualAssign(player.registrationId)" :disabled="!selectedTeamByPlayer[player.registrationId]" class="px-2 py-1 rounded-md bg-gray-800 text-white text-xs hover:bg-gray-900 disabled:opacity-40">
                    手动分队
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="pool.length === 0" class="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-500">
            暂无未分配选手
          </div>
        </div>
      </section>
    </div>

    <section>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-gray-800">拍卖队伍</h3>
        <span class="text-sm text-gray-500">{{ teams.length }} 支队伍</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div v-for="team in teams" :key="team.id" :class="['border rounded-lg bg-white shadow-sm overflow-hidden', team.id === myTeamId ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200']">
          <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-bold text-gray-900">{{ team.name }}</div>
                <div class="text-xs text-gray-500">队长：{{ team.captain?.battleTag || '未设置' }}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-500">剩余资金</div>
                <div class="text-xl font-bold text-gray-900">{{ team.budgetRemaining }}</div>
              </div>
            </div>
            <div v-if="viewer === 'admin'" class="mt-2 text-xs text-gray-500">
              拍卖码：<span class="font-mono text-gray-900">{{ team.captainCode }}</span>
            </div>
            <div v-if="team.lockedBidAmount" class="mt-2 inline-flex px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
              当前出价 {{ team.lockedBidAmount }}
            </div>
          </div>
          <div class="p-3 space-y-2 min-h-36">
            <div v-for="member in team.members" :key="member.registrationId" class="rounded-md bg-gray-900 text-white px-3 py-2">
              <div class="font-medium truncate">{{ member.battleTag || member.nickname }}</div>
              <div class="text-xs text-gray-300 mt-0.5">
                {{ member.primaryRoleLabel || '未填写' }} / {{ member.primaryRank || '未定级' }}
                <span v-if="member.assignedType === 'manual'"> · 手动</span>
                <span v-else> · {{ member.soldPrice }} 点</span>
              </div>
            </div>
            <div v-if="team.members.length === 0" class="text-sm text-gray-400 py-8 text-center">
              暂无队员
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
