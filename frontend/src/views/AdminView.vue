<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { Users, LayoutGrid, CalendarDays, Menu, X, Trash2, Wand2, Plus, Bell, ArrowUp, ArrowDown, LogOut, ExternalLink, Edit2, Gift, Gavel, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import request from '../api/request'
import AuctionBoard from '../components/AuctionBoard.vue'
import { fromBeijingDateTimeInput, toBeijingDateTimeInput } from '../utils/beijingTime'

const router = useRouter()
const isMobileMenuOpen = ref(false)
const isSidebarCollapsed = ref(false)
const currentTab = ref('teams') // 默认进入分队管理
type TeamMode = '5v5' | '6v6'
type ScheduleMode = TeamMode | 'auction'

const teamModeConfigs: Record<TeamMode, { label: string; title: string; maxPlayers: number; slots: string[] }> = {
  '5v5': {
    label: '5V5',
    title: '分队管理 (5V5)',
    maxPlayers: 5,
    slots: ['tank', 'damage', 'damage', 'support', 'support']
  },
  '6v6': {
    label: '6V6',
    title: '分队管理 (6V6)',
    maxPlayers: 6,
    slots: ['tank', 'tank', 'damage', 'damage', 'support', 'support']
  }
}
const scheduleModeConfigs: Record<ScheduleMode, { label: string }> = {
  '5v5': { label: '5V5' },
  '6v6': { label: '6V6' },
  auction: { label: '拍卖分队' }
}

const navigation = [
  { id: 'registration', name: '报名大厅', icon: Users },
  { id: 'teams', name: '分队管理（5V5）', icon: LayoutGrid },
  { id: 'teams6v6', name: '分队管理（6V6）', icon: LayoutGrid },
  { id: 'auction', name: '拍卖分队', icon: Gavel },
  { id: 'schedule', name: '赛程安排', icon: CalendarDays },
  { id: 'announcement', name: '赛事公告', icon: Bell },
  { id: 'donation', name: '打赏管理', icon: Gift },
]

// 数据状态
const players = ref<any[]>([])
const teamGroupsByMode = ref<Record<TeamMode, any[]>>({ '5v5': [], '6v6': [] })
const matchesByMode = ref<Record<ScheduleMode, any[]>>({ '5v5': [], '6v6': [], auction: [] })
const playerPoolByMode = ref<Record<TeamMode, any[]>>({ '5v5': [], '6v6': [] })
const batchTargetTeamIdByMode = ref<Record<TeamMode, number | string>>({ '5v5': '', '6v6': '' })
const isRegistrationOpen = ref(true)
const scheduleMode = ref<ScheduleMode>('5v5')

const isTeamTab = computed(() => currentTab.value === 'teams' || currentTab.value === 'teams6v6')
const currentTeamMode = computed<TeamMode>(() => currentTab.value === 'teams6v6' ? '6v6' : '5v5')
const currentTeamModeConfig = computed(() => teamModeConfigs[currentTeamMode.value])
const teamGroups = computed(() => teamGroupsByMode.value[currentTeamMode.value])
const playerPool = computed(() => playerPoolByMode.value[currentTeamMode.value])
const matches = computed(() => matchesByMode.value[scheduleMode.value])
const batchTargetTeamId = computed<number | string>({
  get: () => batchTargetTeamIdByMode.value[currentTeamMode.value],
  set: (value) => {
    batchTargetTeamIdByMode.value[currentTeamMode.value] = value
  }
})

// 筛选状态
const filterGroupRegistration = ref('all')
const filterGroupPlayerPool = ref('all')
const searchRegistrationText = ref('')
const searchPlayerPoolText = ref('')

const filteredPlayers = computed(() => {
  let result = players.value;
  if (filterGroupRegistration.value !== 'all') {
    result = result.filter(p => p.wechatGroup === filterGroupRegistration.value);
  }
  if (searchRegistrationText.value.trim()) {
    const keyword = searchRegistrationText.value.trim().toLowerCase();
    result = result.filter(p => 
      (p.gameId && p.gameId.toLowerCase().includes(keyword)) ||
      (p.wechatId && p.wechatId.toLowerCase().includes(keyword)) ||
      (p.nickname && p.nickname.toLowerCase().includes(keyword))
    );
  }
  return result;
})

const filteredPlayerPool = computed(() => {
  let result = playerPool.value;
  if (filterGroupPlayerPool.value !== 'all') {
    result = result.filter(p => p.wechatGroup === filterGroupPlayerPool.value);
  }
  if (searchPlayerPoolText.value.trim()) {
    const keyword = searchPlayerPoolText.value.trim().toLowerCase();
    result = result.filter(p => 
      (p.gameId && p.gameId.toLowerCase().includes(keyword)) ||
      (p.wechatId && p.wechatId.toLowerCase().includes(keyword)) ||
      (p.nickname && p.nickname.toLowerCase().includes(keyword))
    );
  }
  return result;
})

// 职位映射
const roleMap: Record<string, string> = {
  tank: '重装',
  damage: '输出',
  support: '支援'
}

const translateRoles = (rolesArray: string[]) => {
  if (!rolesArray || !Array.isArray(rolesArray) || rolesArray.length === 0) return '无'
  return rolesArray.map(r => roleMap[r] || r).join(', ')
}

// 统一的数据获取
onMounted(async () => {
  await fetchData()
})

const fetchData = async () => {
  await fetchRegistrationStatus()
  await fetchRegistrations()
  await fetchTeams('5v5')
  await fetchTeams('6v6')
  await fetchMatches(scheduleMode.value)
  await fetchAuctionState()
  await fetchAnnouncement()
  await fetchDonationData()
}

const fetchRegistrationStatus = async () => {
  try {
    const res: any = await request.get('/registrations/status')
    if (res.success && res.data) {
      isRegistrationOpen.value = res.data.isOpen
    }
  } catch (error) {
    console.error('获取报名状态失败', error)
  }
}

const toggleRegistrationStatus = async () => {
  const newStatus = !isRegistrationOpen.value
  const actionText = newStatus ? '开启' : '关闭'
  
  showConfirm(`确定要${actionText}报名通道吗？${!newStatus ? '关闭后用户将无法提交新的报名信息。' : ''}`, async () => {
    try {
      const res: any = await request.post('/admin/registrations/status', { isOpen: newStatus })
      if (res.success) {
        isRegistrationOpen.value = newStatus
        alert(`报名通道已${actionText}`)
      } else {
        alert(res.message || '操作失败')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '网络错误，操作失败')
    }
  })
}

const fetchRegistrations = async () => {
  try {
    const res: any = await request.get('/admin/registrations')
    if (res.success) {
      players.value = res.data.map((p: any) => {
        const prim = p.primaryRoles || p.primary_roles || []
        const sec = p.secondaryRoles || p.secondary_roles || []
        return {
            id: p.id,
            nickname: (p.battleTag || p.battle_tag || '').split('#')[0] || '未知玩家',
            gameId: p.battleTag || p.battle_tag,
            wechatId: p.wechatId || p.wechat_id || '未提供',
            wechatGroup: p.wechatGroup || p.wechat_group || '未知',
            rawRoles: Array.from(new Set([...prim, ...sec])),
          primaryRolesText: translateRoles(prim),
          secondaryRolesText: translateRoles(sec),
          selfRanks: p.selfRanks || p.self_ranks || {},
          rank: p.score || 0,
          registerTime: new Date(p.createdAt || p.created_at).toLocaleString()
        }
      })
    }
  } catch (error) {
    console.error(error)
  }
}

const deleteRegistration = async (id: number) => {
  showConfirm('确定要删除该条报名信息吗？', async () => {
    try {
      const res: any = await request.delete(`/admin/registrations/${id}`)
      if (res.success) {
        await fetchData()
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '删除失败')
    }
  })
}

const updatePlayerGroup = async (player: any) => {
  try {
    const res: any = await request.put(`/admin/registrations/${player.id}/group`, {
      wechatGroup: player.wechatGroup
    })
    if (!res.success) {
      alert(res.message || '修改群组失败')
      await fetchRegistrations() // 恢复原状
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '网络错误，修改失败')
    await fetchRegistrations() // 恢复原状
  }
}

const clearRegistrations = async () => {
  showConfirm('确定要清空所有报名信息吗？该操作会将报名大厅中的数据全部移除，不可恢复！', async () => {
    try {
      const res: any = await request.delete('/admin/registrations/clear')
      if (res.success) {
        alert('清空成功！')
        await fetchData()
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '清空失败')
    }
  })
}

const fetchTeams = async (mode: TeamMode = currentTeamMode.value) => {
  try {
    const res: any = await request.get(`/board/teams?mode=${mode}`)
    if (res.success) {
      // 按 groupId 分组
      const groupsMap = new Map<string, any[]>()
      res.data.forEach((t: any) => {
        const gId = t.group_id || t.groupId || 'ungrouped'
        if (!groupsMap.has(gId)) groupsMap.set(gId, [])
        groupsMap.get(gId)?.push({
          id: t.id,
          name: t.name,
          avgScore: t.members?.reduce((sum: number, m: any) => sum + Number(m.score || 0), 0) / (t.members?.length || 1) || 0,
          members: t.members || []
        })
      })
      
      const groupsArray: any[] = []
      groupsMap.forEach((teams, groupId) => {
        if (groupId !== 'ungrouped') {
          groupsArray.push({ groupId, teams })
        }
      })
      teamGroupsByMode.value[mode] = groupsArray
      calculateUnassignedPlayers(mode)
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchMatches = async (mode: ScheduleMode = scheduleMode.value) => {
  try {
    const res: any = await request.get(`/board/matches?mode=${mode}`)
    if (res.success) {
      matchesByMode.value[mode] = res.data.map((m: any) => ({
        id: m.id,
        time: m.time || '待定',
        teamA: m.teamAName,
        teamB: m.teamBName,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        matchOrder: m.matchOrder || 0
      }))
    }
  } catch (error) {
    console.error(error)
  }
}

// ------------------------- 自定义 Confirm 弹窗逻辑 -------------------------
const customConfirm = ref({
  show: false,
  message: '',
  onConfirm: () => {}
})

const showConfirm = (message: string, onConfirm: () => void) => {
  customConfirm.value = {
    show: true,
    message,
    onConfirm
  }
}

const handleConfirmYes = () => {
  customConfirm.value.onConfirm()
  customConfirm.value.show = false
}

const handleConfirmNo = () => {
  customConfirm.value.show = false
}

// ------------------------- 公告逻辑 -------------------------

const announcement = ref({
  title: '',
  content: '',
  startTime: ''
})

const fetchAnnouncement = async () => {
  try {
    const res: any = await request.get('/announcements')
    if (res.success && res.data) {
      announcement.value = {
        title: res.data.title || '',
        content: res.data.content || '',
        startTime: toBeijingDateTimeInput(res.data.start_time)
      }
    }
  } catch (error) {
    console.error('获取公告失败', error)
  }
}

const saveAnnouncement = async () => {
  showConfirm('确定要保存并发布该公告吗？', async () => {
    try {
      const payload = {
        title: announcement.value.title,
        content: announcement.value.content,
        startTime: fromBeijingDateTimeInput(announcement.value.startTime)
      }
      const res: any = await request.post('/announcements', payload)
      if (res.success) {
        alert('公告保存成功！')
      } else {
        alert(res.message || '公告保存失败')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '网络错误，保存失败')
    }
  })
}

const clearAnnouncement = async () => {
  showConfirm('确定要清除当前的赛事公告吗？清除后前台将不再显示。', async () => {
    try {
      const res: any = await request.delete('/announcements')
      if (res.success) {
        announcement.value = { title: '', content: '', startTime: '' }
        alert('公告清除成功！')
      } else {
        alert(res.message || '公告清除失败')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '网络错误，清除失败')
    }
  })
}

// ------------------------- 分队核心逻辑 -------------------------

const calculateUnassignedPlayers = (mode: TeamMode = currentTeamMode.value) => {
  const assignedGameIds = new Set()
  teamGroupsByMode.value[mode].forEach(group => {
    group.teams.forEach((team: any) => {
      team.members?.forEach((m: any) => {
        if (m.gameId) assignedGameIds.add(m.gameId)
      })
    })
  })

  playerPoolByMode.value[mode] = players.value
    .filter(p => !assignedGameIds.has(p.gameId))
    .map(p => ({
      ...p,
      selected: false
    }))
}

// 所有存在的队伍扁平化（用于下拉框选择）
const allFlatTeams = computed(() => {
  const list: any[] = []
  teamGroups.value.forEach((g, idx) => {
    g.teams.forEach((t: any) => {
      list.push({
        ...t,
        displayName: `对战组 ${idx + 1} - ${t.name}`
      })
    })
  })
  return list
})

// 为队伍生成固定槽位，优先对号入座，多的塞进空位
const getTeamSlots = (members: any[], mode: TeamMode = currentTeamMode.value) => {
  const slots = teamModeConfigs[mode].slots.map(role => ({
    role,
    label: roleMap[role] || role,
    member: null as any
  }))
  
  const unassignedMembers: any[] = []
  
  // 先把有 assignedRole 且槽位未满的对号入座
  members.forEach((m) => {
    if (m.assignedRole) {
      const emptySlotIndex = slots.findIndex(s => s.role === m.assignedRole && !s.member)
      if (emptySlotIndex > -1) {
        slots[emptySlotIndex].member = m
      } else {
        unassignedMembers.push(m)
      }
    } else {
      unassignedMembers.push(m)
    }
  })
  
  // 将剩余的成员塞入空位
  unassignedMembers.forEach((m) => {
    const emptySlotIndex = slots.findIndex(s => !s.member)
    if (emptySlotIndex > -1) {
      slots[emptySlotIndex].member = m
      slots[emptySlotIndex].label = '越界/补位'
    }
  })
  
  return slots
}

const getPlayerSelfRanks = (gameId: string) => {
  const player = players.value.find(p => p.gameId === gameId)
  return player?.selfRanks || {}
}

const createTeamGroup = async () => {
  const mode = currentTeamMode.value
  showConfirm(`确定要添加一组新的 ${teamModeConfigs[mode].label} 对战组吗？`, async () => {
    try {
      const res: any = await request.post('/admin/teams/group', { mode })
      if (res.success) {
        await fetchTeams(mode)
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '创建队伍组失败')
    }
  })
}

const deleteTeamGroup = async (groupId: string) => {
  const mode = currentTeamMode.value
  showConfirm('确定要删除这组队伍吗？该操作会将队伍解散，玩家退回选手池，并删除关联赛程。', async () => {
    try {
      const res: any = await request.delete(`/admin/teams/group/${groupId}`)
      if (res.success) {
        await fetchTeams(mode)
        await fetchMatches(mode)
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '删除队伍组失败')
    }
  })
}

const autofillModal = ref({
  show: false,
  groupId: '',
  wechatGroup: '',
  mode: '5v5' as TeamMode,
  options: [] as string[]
})

const openAutofillModal = (groupId: string) => {
  const mode = currentTeamMode.value
  const groups = new Set<string>()
  playerPoolByMode.value[mode].forEach(p => {
    if (p.wechatGroup) groups.add(p.wechatGroup)
  })
  
  autofillModal.value.options = Array.from(groups)
  autofillModal.value.wechatGroup = autofillModal.value.options.length > 0 ? autofillModal.value.options[0] : ''
  autofillModal.value.groupId = groupId
  autofillModal.value.mode = mode
  autofillModal.value.show = true
}

const confirmAutofill = async () => {
  const { groupId, wechatGroup, mode } = autofillModal.value
  autofillModal.value.show = false
  
  try {
    const res: any = await request.post(`/admin/teams/group/${groupId}/autofill`, { wechatGroup, mode })
    if (res.success) {
      await fetchTeams(mode)
      alert('自动填充完成')
    } else {
      alert(res.message)
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '自动填充失败')
  }
}

const closeAutofillModal = () => {
  autofillModal.value.show = false
}

const saveTeamChanges = async (team: any) => {
  const mode = currentTeamMode.value
  try {
    await request.post('/admin/teams/edit', {
      teamId: team.id,
      members: team.members,
      name: team.name
    })
    calculateUnassignedPlayers(mode)
  } catch (error) {
    console.error('保存队伍变更失败', error)
  }
}

const editTeamName = async (team: any) => {
  const mode = currentTeamMode.value
  const newName = window.prompt('请输入新的队伍名称：', team.name)
  if (newName !== null) {
    const trimmed = newName.trim()
    if (trimmed && trimmed !== team.name) {
      try {
        const res: any = await request.post('/admin/teams/edit', {
          teamId: team.id,
          members: team.members,
          name: trimmed
        })
        if (res.success) {
          team.name = trimmed
          await fetchTeams(mode)
          await fetchMatches(mode)
          alert('修改名称成功')
        } else {
          alert(res.message || '修改名称失败')
        }
      } catch (error: any) {
        alert(error.response?.data?.message || '网络错误，修改名称失败')
      }
    }
  }
}

const removePlayerFromTeam = async (teamId: number, gameId: string) => {
  showConfirm('确定要将该选手移出队伍吗？', async () => {
    const team = allFlatTeams.value.find(t => t.id === teamId)
    if (team) {
      const idx = team.members.findIndex((m: any) => m.gameId === gameId)
      if (idx > -1) {
        team.members.splice(idx, 1)
        await saveTeamChanges(team)
      }
    }
  })
}

// 尝试将一个玩家加入一个队伍（无视职责限制，仅保留当前模式人数上限）
const tryAddPlayerToTeam = (player: any, team: any): boolean => {
  const mode = currentTeamMode.value
  const maxPlayers = teamModeConfigs[mode].maxPlayers
  if (team.members.length >= maxPlayers) {
    return false
  }

  const slots = getTeamSlots(team.members, mode)
  // 获取队伍当前还缺少的职位
  const missingRoles = slots.filter(s => !s.member).map(s => s.role)
  
  // 检查玩家能否打这些缺少的职位
  const playerCanPlay = player.rawRoles || []
  
  // 尽量优先分配匹配的空位，如果不匹配则随机分配一个空位，如果没有空位则分配"补位"
  let matchedRole = missingRoles.find(role => playerCanPlay.includes(role))
  if (!matchedRole) {
    matchedRole = missingRoles.length > 0 ? missingRoles[0] : 'flex'
  }
  
  team.members.push({
    id: player.id,
    nickname: player.nickname,
    gameId: player.gameId,
    roles: player.rawRoles,
    assignedRole: matchedRole,
    score: player.rank || 0
  })
  return true
}

// 单个加入
const addPlayerToTeam = async (playerGameId: string, teamId: number | string) => {
  if (!teamId) return
  const team = allFlatTeams.value.find(t => t.id === Number(teamId))
  const player = playerPool.value.find(p => p.gameId === playerGameId)
  
  if (team && player) {
    const success = tryAddPlayerToTeam(player, team)
    if (success) {
      await saveTeamChanges(team)
    } else {
      alert(`队伍 [${team.name}] 已经满 ${teamModeConfigs[currentTeamMode.value].maxPlayers} 人，无法继续加入`)
    }
  }
}

// 批量加入
const batchAddPlayers = async () => {
  if (!batchTargetTeamId.value) return alert('请先在上方选择要批量加入的目标队伍')
  
  const team = allFlatTeams.value.find(t => t.id === Number(batchTargetTeamId.value))
  if (!team) return
  
  const selectedPlayers = playerPool.value.filter(p => p.selected)
  if (selectedPlayers.length === 0) return alert('请勾选至少一名未分配选手')
  
  let addedCount = 0
  let failedNames = []
  
  for (const player of selectedPlayers) {
    if (tryAddPlayerToTeam(player, team)) {
      addedCount++
    } else {
      failedNames.push(player.nickname)
    }
  }
  
  if (addedCount > 0) {
    await saveTeamChanges(team)
  }
  
  if (failedNames.length > 0) {
    alert(`成功加入 ${addedCount} 人。\n\n以下选手因队伍已满未能加入：\n${failedNames.join(', ')}`)
  } else {
    alert(`成功批量加入 ${addedCount} 人！`)
  }
}

// ------------------------- 赛程与比分逻辑 -------------------------

const setScheduleMode = async (mode: ScheduleMode) => {
  scheduleMode.value = mode
  await fetchMatches(mode)
}

const publishSchedule = async (mode: ScheduleMode = scheduleMode.value) => {
  await fetchMatches(mode)
  const currentMatches = matchesByMode.value[mode] || []
  if (currentMatches.length > 0) {
    showConfirm(`当前已有 ${scheduleModeConfigs[mode].label} 赛程安排，发布新赛程前将清空现有赛程！确定要重新发布吗？`, () => executePublish(mode))
  } else {
    executePublish(mode)
  }
}

const executePublish = async (mode: ScheduleMode = scheduleMode.value) => {
  try {
    const res: any = await request.post('/admin/matches/generate', { mode })
    if (res.success) {
      alert(mode === 'auction' ? '队伍信息发布成功！' : '赛程生成发布成功！')
      await fetchMatches(mode)
    } else {
      alert(res.message)
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '发布失败')
  }
}

const clearSchedule = async (mode: ScheduleMode = scheduleMode.value) => {
  const message = mode === 'auction'
    ? '确定要删除已发布的拍卖队伍信息吗？这不会影响当前拍卖进度。'
    : `确定要清空当前 ${scheduleModeConfigs[mode].label} 赛程安排吗？这将会删除所有的对局和比分！`
  showConfirm(message, async () => {
    try {
      const res: any = await request.delete(`/admin/matches/clear?mode=${mode}`)
      if (res.success) {
        alert(mode === 'auction' ? '已发布队伍信息删除成功！' : '赛程清空成功！')
        await fetchMatches(mode)
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '清空失败')
    }
  })
}

const publishAuctionTeams = () => {
  showConfirm('确定要发布当前拍卖队伍信息吗？重复发布会覆盖之前发布的拍卖队伍。', () => executePublish('auction'))
}
const clearPublishedAuctionTeams = () => clearSchedule('auction')

const saveScheduleChanges = async () => {
  const mode = scheduleMode.value
  showConfirm('确定要保存当前的赛程修改吗？', async () => {
    try {
      const payload = {
        mode,
        matches: matches.value.map((m, index) => ({
          id: m.id,
          status: m.status,
          matchOrder: index + 1 // 根据当前在数组中的顺序设置 order
        }))
      }
      const res: any = await request.post('/admin/matches/update', payload)
      if (res.success) {
        alert('赛程变更保存成功！')
        await fetchMatches(mode)
      } else {
        alert(res.message)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '保存失败')
    }
  })
}

const moveMatchUp = (index: number) => {
  if (index > 0) {
    const temp = matches.value[index]
    matches.value[index] = matches.value[index - 1]
    matches.value[index - 1] = temp
  }
}

const moveMatchDown = (index: number) => {
  if (index < matches.value.length - 1) {
    const temp = matches.value[index]
    matches.value[index] = matches.value[index + 1]
    matches.value[index + 1] = temp
  }
}

const showScoreModal = ref(false)
const currentMatchId = ref<number | null>(null)
const scoreInputA = ref<number>(0)
const scoreInputB = ref<number>(0)

const openScoreModal = (matchId: number) => {
  const match = matches.value.find(m => m.id === matchId)
  if (match) {
    currentMatchId.value = matchId
    scoreInputA.value = match.scoreA || 0
    scoreInputB.value = match.scoreB || 0
    showScoreModal.value = true
  }
}

const closeScoreModal = () => {
  showScoreModal.value = false
  currentMatchId.value = null
}

const saveScore = async () => {
  if (currentMatchId.value !== null) {
    const mode = scheduleMode.value
    showConfirm('确定要保存比分吗？', async () => {
      try {
        const res: any = await request.post('/admin/matches/score', {
          matchId: currentMatchId.value,
          scoreA: scoreInputA.value,
          scoreB: scoreInputB.value,
          mode
        })
        
        if (res.success) {
          // 更新本地数据展示
          const match = matches.value.find(m => m.id === currentMatchId.value)
          if (match) {
            match.scoreA = scoreInputA.value
            match.scoreB = scoreInputB.value
          }
          closeScoreModal()
          alert('比分录入成功！')
        } else {
          alert(res.message || '比分录入失败')
        }
      } catch (error: any) {
        alert(error.response?.data?.message || '网络错误，比分录入失败')
      }
    })
  }
}

// ------------------------- 拍卖分队逻辑 -------------------------
const auctionState = ref<any>(null)
const auctionTargetTeamCount = ref(0)
const selectedCaptainTier = ref('')
const isAuctionLoading = ref(false)
const auctionRefreshTimer = ref<number | null>(null)

const auctionRankOptions = computed(() => auctionState.value?.rankOptions || [])
const selectedCaptainOption = computed(() => auctionRankOptions.value.find((option: any) => option.tier === selectedCaptainTier.value))
const auctionHasSession = computed(() => Boolean(auctionState.value?.session))

const applyAuctionState = (state: any) => {
  auctionState.value = state
  if (state?.session?.teamCount) {
    auctionTargetTeamCount.value = state.session.teamCount
  } else if (state?.requestedTeamCount) {
    auctionTargetTeamCount.value = state.requestedTeamCount
  }
  if (selectedCaptainTier.value && !auctionRankOptions.value.some((option: any) => option.tier === selectedCaptainTier.value && option.eligible)) {
    selectedCaptainTier.value = ''
  }
}

const fetchAuctionState = async () => {
  try {
    const params = new URLSearchParams()
    if (auctionTargetTeamCount.value > 0) {
      params.set('teamCount', String(auctionTargetTeamCount.value))
    }
    params.set('_t', String(Date.now()))
    const res: any = await request.get(`/admin/auction/state?${params.toString()}`)
    if (res.success) {
      applyAuctionState(res.data)
    }
  } catch (error) {
    console.error('获取拍卖分队状态失败', error)
  }
}

const refreshAuctionOptions = async () => {
  if (auctionHasSession.value) return
  if (auctionTargetTeamCount.value < 2) auctionTargetTeamCount.value = 2
  await fetchAuctionState()
}

const drawAuctionCaptains = () => {
  if (!selectedCaptainTier.value) {
    alert('请先选择可用的队长段位')
    return
  }
  if (!selectedCaptainOption.value?.eligible) {
    alert('当前段位人数不足，不能抽取队长')
    return
  }

  showConfirm(`确定从 ${selectedCaptainTier.value} 段位中抽取 ${auctionTargetTeamCount.value} 名队长吗？`, async () => {
    isAuctionLoading.value = true
    try {
      const res: any = await request.post('/admin/auction/draw-captains', {
        rankTier: selectedCaptainTier.value,
        teamCount: auctionTargetTeamCount.value
      })
      if (res.success) {
        applyAuctionState(res.data)
        alert('队长抽取成功，请将拍卖码私下发给队长')
      } else {
        alert(res.message || '抽取队长失败')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '抽取队长失败')
    } finally {
      isAuctionLoading.value = false
    }
  })
}

const drawAuctionPlayer = async () => {
  isAuctionLoading.value = true
  try {
    const res: any = await request.post('/admin/auction/draw-player')
    if (res.success) {
      applyAuctionState(res.data)
    } else {
      alert(res.message || '抽取拍卖队员失败')
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '抽取拍卖队员失败')
  } finally {
    isAuctionLoading.value = false
  }
}

const finishAuctionCurrent = () => {
  showConfirm('确定将当前拍卖队员成交给最高出价队伍吗？', async () => {
    isAuctionLoading.value = true
    try {
      const res: any = await request.post('/admin/auction/finish-current')
      if (res.success) {
        applyAuctionState(res.data)
      } else {
        alert(res.message || '拍卖成交失败')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '拍卖成交失败')
    } finally {
      isAuctionLoading.value = false
    }
  })
}

const passAuctionCurrent = () => {
  showConfirm('确定将当前拍卖队员标记为流拍吗？该队员会回到未分配选手池。', async () => {
    isAuctionLoading.value = true
    try {
      const res: any = await request.post('/admin/auction/pass-current')
      if (res.success) {
        applyAuctionState(res.data)
      } else {
        alert(res.message || '流拍失败')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '流拍失败')
    } finally {
      isAuctionLoading.value = false
    }
  })
}

const manualAssignAuctionPlayer = ({ registrationId, teamId }: { registrationId: number; teamId: number }) => {
  showConfirm('确定将该选手手动分配到目标队伍吗？', async () => {
    isAuctionLoading.value = true
    try {
      const res: any = await request.post('/admin/auction/manual-assign', { registrationId, teamId })
      if (res.success) {
        applyAuctionState(res.data)
      } else {
        alert(res.message || '手动分队失败')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '手动分队失败')
    } finally {
      isAuctionLoading.value = false
    }
  })
}

const resetAuction = () => {
  showConfirm('确定要重置当前拍卖分队吗？队长、拍卖码、竞价和分队结果都会被清空。', async () => {
    isAuctionLoading.value = true
    try {
      const res: any = await request.post('/admin/auction/reset', { teamCount: auctionTargetTeamCount.value })
      if (res.success) {
        selectedCaptainTier.value = ''
        applyAuctionState(res.data)
      } else {
        alert(res.message || '重置失败')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '重置失败')
    } finally {
      isAuctionLoading.value = false
    }
  })
}

const stopAuctionRefresh = () => {
  if (auctionRefreshTimer.value) {
    window.clearInterval(auctionRefreshTimer.value)
    auctionRefreshTimer.value = null
  }
}

const startAuctionRefresh = () => {
  if (auctionRefreshTimer.value) return
  auctionRefreshTimer.value = window.setInterval(() => {
    if (currentTab.value === 'auction') {
      fetchAuctionState()
    }
  }, 500)
}

watch(currentTab, (tab) => {
  if (tab === 'auction') {
    fetchAuctionState()
    startAuctionRefresh()
  } else {
    stopAuctionRefresh()
  }
})

onBeforeUnmount(() => {
  stopAuctionRefresh()
})

const handleLogout = () => {
  showConfirm('确定要退出登录吗？', () => {
    localStorage.removeItem('token')
    router.push('/login')
  })
}

// ------------------------- 打赏管理逻辑 -------------------------
const donators = ref<any[]>([])
const operators = ref<any[]>([])
const adminContacts = ref<any[]>([])

const fetchDonationData = async () => {
  try {
    const res: any = await request.get('/footer')
    if (res.success && res.data) {
      donators.value = res.data.donators
      operators.value = res.data.operators
      adminContacts.value = res.data.adminContacts
    }
  } catch (error) {
    console.error('获取打赏管理数据失败', error)
  }
}

// 通用增删改操作
const handleAddDonator = async () => {
  const name = window.prompt('请输入打赏人员名称：')
  if (!name) return
  const amountStr = window.prompt('请输入打赏额度（数字）：', '0')
  if (amountStr === null) return
  const amount = Number(amountStr)
  if (isNaN(amount) || amount < 0) {
    alert('打赏额度必须为大于等于0的数字')
    return
  }
  
  try {
    const res: any = await request.post('/footer/admin/donators', { name, amount })
    if (res.success) await fetchDonationData()
    else alert(res.message || '添加失败')
  } catch (error: any) {
    alert(error.response?.data?.message || '网络错误，添加失败')
  }
}

const handleEditDonator = async (item: any) => {
  const name = window.prompt('请输入新的名称：', item.name)
  if (!name) return
  const amountStr = window.prompt('请输入新的打赏额度（数字）：', String(item.amount))
  if (amountStr === null) return
  const amount = Number(amountStr)
  if (isNaN(amount) || amount < 0) {
    alert('打赏额度必须为大于等于0的数字')
    return
  }
  
  try {
    const res: any = await request.put(`/footer/admin/donators/${item.id}`, { name, amount })
    if (res.success) await fetchDonationData()
    else alert(res.message || '修改失败')
  } catch (error: any) {
    alert(error.response?.data?.message || '网络错误，修改失败')
  }
}

const handleDeleteDonator = async (id: number) => {
  showConfirm('确定要删除该打赏人员吗？', async () => {
    try {
      const res: any = await request.delete(`/footer/admin/donators/${id}`)
      if (res.success) await fetchDonationData()
      else alert(res.message || '删除失败')
    } catch (error: any) {
      alert(error.response?.data?.message || '网络错误，删除失败')
    }
  })
}

const handleAddOperator = async () => {
  const name = window.prompt('请输入运营团队成员名称：')
  if (!name) return
  try {
    const res: any = await request.post('/footer/admin/operators', { name })
    if (res.success) await fetchDonationData()
    else alert(res.message || '添加失败')
  } catch (error: any) {
    alert(error.response?.data?.message || '网络错误，添加失败')
  }
}

const handleEditOperator = async (item: any) => {
  const name = window.prompt('请输入新的名称：', item.name)
  if (!name) return
  try {
    const res: any = await request.put(`/footer/admin/operators/${item.id}`, { name })
    if (res.success) await fetchDonationData()
    else alert(res.message || '修改失败')
  } catch (error: any) {
    alert(error.response?.data?.message || '网络错误，修改失败')
  }
}

const handleDeleteOperator = async (id: number) => {
  showConfirm('确定要删除该运营团队成员吗？', async () => {
    try {
      const res: any = await request.delete(`/footer/admin/operators/${id}`)
      if (res.success) await fetchDonationData()
      else alert(res.message || '删除失败')
    } catch (error: any) {
      alert(error.response?.data?.message || '网络错误，删除失败')
    }
  })
}

const handleAddContact = async () => {
  if (adminContacts.value.length >= 5) {
    alert('最多只能添加 5 个管理员打赏联系方式')
    return
  }
  
  const type = window.prompt('请输入联系方式类型 (qq / wechat / email)：')
  if (!type || !['qq', 'wechat', 'email'].includes(type.toLowerCase())) {
    alert('类型只能是 qq, wechat 或 email')
    return
  }
  const value = window.prompt('请输入联系内容：')
  if (!value) return
  
  if (type.toLowerCase() === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    alert('请输入有效的邮箱地址')
    return
  }
  
  try {
    const res: any = await request.post('/footer/admin/contacts', { type: type.toLowerCase(), value })
    if (res.success) await fetchDonationData()
    else alert(res.message || '添加失败')
  } catch (error: any) {
    alert(error.response?.data?.message || '网络错误，添加失败')
  }
}

const handleEditContact = async (item: any) => {
  const type = window.prompt('请输入新的联系方式类型 (qq / wechat / email)：', item.type)
  if (!type || !['qq', 'wechat', 'email'].includes(type.toLowerCase())) {
    alert('类型只能是 qq, wechat 或 email')
    return
  }
  const value = window.prompt('请输入新的联系内容：', item.value)
  if (!value) return
  
  if (type.toLowerCase() === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    alert('请输入有效的邮箱地址')
    return
  }
  
  try {
    const res: any = await request.put(`/footer/admin/contacts/${item.id}`, { type: type.toLowerCase(), value })
    if (res.success) await fetchDonationData()
    else alert(res.message || '修改失败')
  } catch (error: any) {
    alert(error.response?.data?.message || '网络错误，修改失败')
  }
}

const handleDeleteContact = async (id: number) => {
  showConfirm('确定要删除该联系方式吗？', async () => {
    try {
      const res: any = await request.delete(`/footer/admin/contacts/${id}`)
      if (res.success) await fetchDonationData()
      else alert(res.message || '删除失败')
    } catch (error: any) {
      alert(error.response?.data?.message || '网络错误，删除失败')
    }
  })
}

// 搜索状态
const searchDonatorText = ref('')
const searchOperatorText = ref('')

const filteredDonators = computed(() => {
  if (!searchDonatorText.value.trim()) return donators.value
  const kw = searchDonatorText.value.trim().toLowerCase()
  return donators.value.filter(d => d.name.toLowerCase().includes(kw))
})

const filteredOperators = computed(() => {
  if (!searchOperatorText.value.trim()) return operators.value
  const kw = searchOperatorText.value.trim().toLowerCase()
  return operators.value.filter(o => o.name.toLowerCase().includes(kw))
})

</script>

<template>
  <div class="h-screen bg-gray-100 flex flex-col md:flex-row overflow-hidden">
    <!-- Mobile Header -->
    <div class="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center relative z-50 flex-shrink-0">
      <span class="text-lg font-bold">赛事管理后台</span>
      <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="p-2">
        <Menu v-if="!isMobileMenuOpen" class="w-6 h-6" />
        <X v-else class="w-6 h-6" />
      </button>
    </div>

    <!-- Sidebar -->
    <div
      :class="[
        'bg-gray-900 text-white w-full flex-shrink-0 flex-col md:flex transition-all duration-300 ease-in-out',
        isSidebarCollapsed ? 'md:w-20' : 'md:w-64',
        isMobileMenuOpen ? 'flex absolute inset-0 z-40 pt-16' : 'hidden h-full'
      ]"
    >
      <div class="p-4 hidden md:flex items-center justify-between gap-2 flex-shrink-0">
        <h1 v-if="!isSidebarCollapsed" class="text-xl font-bold">赛事管理后台</h1>
        <button @click="isSidebarCollapsed = !isSidebarCollapsed" class="p-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors" :title="isSidebarCollapsed ? '展开菜单' : '收缩菜单'">
          <ChevronRight v-if="isSidebarCollapsed" class="w-5 h-5" />
          <ChevronLeft v-else class="w-5 h-5" />
        </button>
      </div>
      <nav class="mt-2 md:mt-6 px-4 space-y-2 flex-1 overflow-y-auto">
        <a
          v-for="item in navigation"
          :key="item.id"
          href="#"
          @click.prevent="currentTab = item.id; isMobileMenuOpen = false"
          :class="[
            'flex items-center py-3 text-sm font-medium rounded-md transition-colors',
            isSidebarCollapsed ? 'md:justify-center md:px-3 px-4' : 'px-4',
            currentTab === item.id 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          ]"
        >
          <component :is="item.icon" :class="['w-5 h-5', isSidebarCollapsed ? 'md:mr-0 mr-3' : 'mr-3']" />
          <span v-if="!isSidebarCollapsed || isMobileMenuOpen">{{ item.name }}</span>
        </a>
      </nav>
      
      <!-- C端入口与退出 -->
      <div class="px-4 py-4 border-t border-gray-800 space-y-2 flex-shrink-0">
        <router-link to="/" :class="['flex items-center py-3 text-sm font-medium text-gray-400 rounded-md hover:bg-gray-800 hover:text-white transition-colors', isSidebarCollapsed ? 'md:justify-center md:px-3 px-4' : 'px-4']">
          <ExternalLink :class="['w-5 h-5', isSidebarCollapsed ? 'md:mr-0 mr-3' : 'mr-3']" />
          <span v-if="!isSidebarCollapsed || isMobileMenuOpen">返回报名大厅</span>
        </router-link>
        <router-link to="/board" :class="['flex items-center py-3 text-sm font-medium text-gray-400 rounded-md hover:bg-gray-800 hover:text-white transition-colors', isSidebarCollapsed ? 'md:justify-center md:px-3 px-4' : 'px-4']">
          <ExternalLink :class="['w-5 h-5', isSidebarCollapsed ? 'md:mr-0 mr-3' : 'mr-3']" />
          <span v-if="!isSidebarCollapsed || isMobileMenuOpen">返回赛事看板</span>
        </router-link>
        <button @click="handleLogout" :class="['w-full flex items-center py-3 text-sm font-medium text-red-400 rounded-md hover:bg-gray-800 hover:text-red-300 transition-colors mt-4', isSidebarCollapsed ? 'md:justify-center md:px-3 px-4' : 'px-4']">
          <LogOut :class="['w-5 h-5', isSidebarCollapsed ? 'md:mr-0 mr-3' : 'mr-3']" />
          <span v-if="!isSidebarCollapsed || isMobileMenuOpen">退出登录</span>
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div :class="['flex-1 overflow-y-auto p-4 md:p-8 relative z-0', isMobileMenuOpen ? 'hidden md:block' : 'block']">
      <div class="bg-white rounded-lg shadow-sm min-h-full p-6">
        
        <!-- Registration Hall -->
        <div v-if="currentTab === 'registration'">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div class="flex flex-wrap items-center gap-4">
              <h2 class="text-2xl font-bold text-gray-800">报名大厅</h2>
              <input type="text" v-model="searchRegistrationText" placeholder="搜索战网ID或微信" class="border border-gray-300 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48">
              <select v-model="filterGroupRegistration" class="border border-gray-300 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="all">全部群组</option>
                <option value="一群">一群</option>
                <option value="二群">二群</option>
              </select>
              
              <!-- 报名通道开关 -->
              <div class="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                <span class="text-sm font-medium text-gray-700">报名通道</span>
                <button 
                  @click="toggleRegistrationStatus"
                  :class="isRegistrationOpen ? 'bg-green-500' : 'bg-gray-300'"
                  class="relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                >
                  <span 
                    aria-hidden="true" 
                    :class="isRegistrationOpen ? 'translate-x-5' : 'translate-x-0'"
                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  ></span>
                </button>
                <span class="text-xs" :class="isRegistrationOpen ? 'text-green-600 font-bold' : 'text-gray-500'">{{ isRegistrationOpen ? '已开启' : '已关闭' }}</span>
              </div>
            </div>
            <button @click="clearRegistrations" class="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              <Trash2 class="w-4 h-4 mr-1" /> 移除全部
            </button>
          </div>
          <div class="w-full max-w-[100vw] overflow-x-auto whitespace-nowrap border border-gray-200 rounded-lg" style="-webkit-overflow-scrolling: touch;">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">玩家昵称 (战网ID)</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">群组</th>
                  <!-- <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">抖音昵称</th> -->
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">微信昵称</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">首选职责</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">补位职责</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">自填段位</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">报名时间</th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="player in filteredPlayers" :key="player.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ player.gameId }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select 
                      v-model="player.wechatGroup" 
                      @change="updatePlayerGroup(player)"
                      :class="player.wechatGroup === '一群' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-green-50 text-green-800 border-green-200'" 
                      class="px-2 py-1 rounded text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="一群">一群</option>
                      <option value="二群">二群</option>
                    </select>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ player.wechatId }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ player.primaryRolesText || '无' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ player.secondaryRolesText || '无' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div v-if="player.selfRanks && Object.keys(player.selfRanks).length > 0">
                      <span v-if="player.selfRanks.tank" class="mr-2">坦:{{ player.selfRanks.tank }}</span>
                      <span v-if="player.selfRanks.damage" class="mr-2">输:{{ player.selfRanks.damage }}</span>
                      <span v-if="player.selfRanks.support">支:{{ player.selfRanks.support }}</span>
                    </div>
                    <span v-else>未填</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ player.registerTime }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button @click="deleteRegistration(player.id)" class="text-red-600 hover:text-red-900">删除</button>
                  </td>
                </tr>
                <tr v-if="filteredPlayers.length === 0">
                  <td colspan="8" class="px-6 py-10 text-center text-gray-500">暂无报名数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Teams Management -->
        <div v-if="isTeamTab">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">{{ currentTeamModeConfig.title }}</h2>
            <button @click="createTeamGroup" class="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              <Plus class="w-4 h-4 mr-1" /> 添加一组队伍
            </button>
          </div>
          
          <div v-if="teamGroups.length === 0" class="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-gray-500 mb-8">
            当前没有正在进行的队伍，请点击右上角添加一组队伍
          </div>

          <!-- 队伍组展示 -->
          <div v-for="(group, idx) in teamGroups" :key="group.groupId" class="mb-8 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden shadow-sm">
            <div class="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 class="font-bold text-gray-700">对战组 {{ idx + 1 }}</h3>
              <div class="flex space-x-3">
                <button @click="openAutofillModal(group.groupId)" class="flex items-center text-sm text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-md shadow-sm">
                  <Wand2 class="w-4 h-4 mr-1" /> 自动填充本组
                </button>
                <button @click="deleteTeamGroup(group.groupId)" class="flex items-center text-sm text-red-600 hover:text-red-800 bg-white border border-red-200 px-3 py-1.5 rounded-md shadow-sm">
                  <Trash2 class="w-4 h-4 mr-1" /> 删除该组
                </button>
              </div>
            </div>
            
            <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div v-for="team in group.teams" :key="team.id" class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div class="flex items-center justify-between mb-3 border-b pb-2">
                  <div class="flex items-center">
                    <h4 class="text-lg font-semibold text-gray-800">{{ team.name }}</h4>
                    <button @click="editTeamName(team)" class="ml-2 text-gray-400 hover:text-blue-600" title="修改队伍名称">
                      <Edit2 class="w-4 h-4" />
                    </button>
                  </div>
                  <div class="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded font-medium">
                    均分: {{ Math.round(team.avgScore) }}
                  </div>
                </div>
                <ul class="space-y-2">
                  <!-- 渲染当前模式职责槽位 -->
                  <li v-for="(slot, i) in getTeamSlots(team.members, currentTeamMode)" :key="i" class="flex flex-col p-2 rounded bg-gray-50 border border-gray-100">
                    <div class="flex justify-between items-center w-full">
                      <div class="flex items-center">
                        <span class="inline-block w-16 text-xs font-bold text-gray-400 text-center mr-2">{{ slot.label }}</span>
                        <span v-if="slot.member" class="text-sm font-medium text-gray-900">{{ slot.member.nickname }}</span>
                        <span v-else class="text-sm italic text-gray-400">空缺</span>
                      </div>
                      <div v-if="slot.member" class="flex items-center space-x-2">
                        <select v-model="slot.member.assignedRole" @change="saveTeamChanges(team)" class="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none text-gray-600">
                          <option value="tank">重装</option>
                          <option value="damage">输出</option>
                          <option value="support">支援</option>
                          <option value="flex">补位</option>
                        </select>
                        <span class="text-xs text-gray-500 w-16 truncate" :title="slot.member.gameId">{{ slot.member.gameId.split('#')[1] ? '#' + slot.member.gameId.split('#')[1] : slot.member.gameId }}</span>
                        <button @click="removePlayerFromTeam(team.id, slot.member.gameId)" class="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors" title="移出队伍">
                          <X class="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <!-- 队员段位信息 -->
                    <div v-if="slot.member && Object.keys(getPlayerSelfRanks(slot.member.gameId)).length > 0" class="flex items-center mt-1.5 ml-[4.5rem]">
                      <div class="text-xs space-x-1 flex items-center">
                        <span v-if="getPlayerSelfRanks(slot.member.gameId).tank" class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">坦:{{ getPlayerSelfRanks(slot.member.gameId).tank }}</span>
                        <span v-if="getPlayerSelfRanks(slot.member.gameId).damage" class="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">输:{{ getPlayerSelfRanks(slot.member.gameId).damage }}</span>
                        <span v-if="getPlayerSelfRanks(slot.member.gameId).support" class="bg-green-50 text-green-600 px-1.5 py-0.5 rounded">支:{{ getPlayerSelfRanks(slot.member.gameId).support }}</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Unassigned Player Pool -->
          <div class="mt-12">
            <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-4">
              <div class="flex items-center space-x-4 flex-wrap gap-y-2">
                <h3 class="text-xl font-bold text-gray-800">未分配选手池</h3>
                <input type="text" v-model="searchPlayerPoolText" placeholder="搜索战网ID或微信" class="border border-gray-300 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48">
                <select v-model="filterGroupPlayerPool" class="border border-gray-300 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="all">全部群组</option>
                  <option value="一群">一群</option>
                  <option value="二群">二群</option>
                </select>
              </div>
              <!-- 批量操作区 -->
              <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
                <span class="text-sm text-gray-500 font-medium ml-1">批量操作：</span>
                <select v-model="batchTargetTeamId" class="flex-1 sm:flex-none border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                  <option value="" disabled>选择目标队伍</option>
                  <option v-for="team in allFlatTeams" :key="team.id" :value="team.id">
                    {{ team.displayName }}
                  </option>
                </select>
                <button @click="batchAddPlayers" :disabled="!batchTargetTeamId" class="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                  批量加入
                </button>
              </div>
            </div>
            
            <div class="w-full max-w-[100vw] overflow-x-auto whitespace-nowrap border border-gray-200 rounded-lg shadow-sm" style="-webkit-overflow-scrolling: touch;">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-4 py-3 text-left w-10"></th>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">战网ID</th>
                    <!-- <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">抖音昵称</th> -->
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">微信昵称</th>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">职责与段位</th>
                    <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="player in filteredPlayerPool" :key="player.gameId" class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-4 whitespace-nowrap">
                      <input type="checkbox" v-model="player.selected" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ player.gameId }}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ player.wechatId || '未知' }}</td>
                    <td class="px-4 py-4 whitespace-nowrap">
                      <div class="flex items-center space-x-2">
                        <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">首选: {{ player.primaryRolesText }}</span>
                        <span v-if="player.secondaryRolesText && player.secondaryRolesText !== '无'" class="text-xs px-2 py-1 bg-gray-50 text-gray-500 rounded border border-dashed">补: {{ player.secondaryRolesText }}</span>
                        <div v-if="player.selfRanks && Object.keys(player.selfRanks).length > 0" class="text-xs text-gray-500 space-x-1 flex items-center ml-2">
                          <span v-if="player.selfRanks.tank" class="bg-blue-50 text-blue-600 px-1 rounded">坦:{{ player.selfRanks.tank }}</span>
                          <span v-if="player.selfRanks.damage" class="bg-red-50 text-red-600 px-1 rounded">输:{{ player.selfRanks.damage }}</span>
                          <span v-if="player.selfRanks.support" class="bg-green-50 text-green-600 px-1 rounded">支:{{ player.selfRanks.support }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-right">
                      <div class="flex items-center justify-end space-x-2">
                        <select v-model="player.selectedTeamId" class="border border-gray-300 rounded-md text-sm py-1 pl-2 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                          <option value="" disabled>选择队伍</option>
                          <option v-for="team in allFlatTeams" :key="team.id" :value="team.id">
                            {{ team.displayName }}
                          </option>
                        </select>
                        <button @click="addPlayerToTeam(player.gameId, player.selectedTeamId)" :disabled="!player.selectedTeamId" class="px-3 py-1 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 disabled:opacity-50 transition-colors">
                          单人加入
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="filteredPlayerPool.length === 0">
                    <td colspan="5" class="px-4 py-8 text-center text-gray-500">当前没有未分配选手</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Auction Management -->
        <div v-if="currentTab === 'auction'">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 class="text-2xl font-bold text-gray-800">拍卖分队</h2>
              <p class="text-sm text-gray-500 mt-1">独立于 5V5 / 6V6 分队，使用报名数据作为拍卖候选池。</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button @click="fetchAuctionState" class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                刷新
              </button>
              <button @click="publishAuctionTeams" :disabled="!auctionState?.session" class="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 transition-colors">
                发布队伍信息
              </button>
              <button @click="clearPublishedAuctionTeams" class="px-4 py-2 rounded-md border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
                删除已发布队伍
              </button>
              <button @click="resetAuction" :disabled="!auctionState" class="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:bg-gray-300 transition-colors">
                重置拍卖
              </button>
            </div>
          </div>

          <div v-if="auctionState" class="space-y-6">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div class="text-xs text-gray-500">报名人数</div>
                <div class="text-2xl font-bold text-gray-900">{{ auctionState.totalPlayers }}</div>
              </div>
              <div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div class="text-xs text-gray-500">建议队伍</div>
                <div class="text-2xl font-bold text-gray-900">{{ auctionState.suggestedTeamCount }}</div>
              </div>
              <div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div class="text-xs text-gray-500">目标队伍</div>
                <div class="text-2xl font-bold text-gray-900">{{ auctionTargetTeamCount }}</div>
              </div>
              <div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div class="text-xs text-gray-500">每队资金</div>
                <div class="text-2xl font-bold text-gray-900">{{ auctionState.session?.initialBudget || auctionState.initialBudgetPreview }}</div>
              </div>
              <div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div class="text-xs text-gray-500">匿名模式</div>
                <div class="text-2xl font-bold" :class="auctionState.anonymousMode ? 'text-amber-600' : 'text-gray-900'">{{ auctionState.anonymousMode ? '开启' : '关闭' }}</div>
              </div>
            </div>

            <div class="border border-gray-200 rounded-lg bg-white shadow-sm p-5">
              <div v-if="!auctionHasSession" class="space-y-5">
                <div class="flex flex-col md:flex-row md:items-end gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">目标队伍数</label>
                    <input
                      v-model.number="auctionTargetTeamCount"
                      @change="refreshAuctionOptions"
                      type="number"
                      min="2"
                      class="w-32 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button @click="drawAuctionCaptains" :disabled="!selectedCaptainTier || isAuctionLoading" class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
                    抽取队长
                  </button>
                </div>

                <div>
                  <div class="text-sm font-medium text-gray-700 mb-2">选择队长目标段位</div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="option in auctionRankOptions"
                      :key="option.tier"
                      @click="option.eligible && (selectedCaptainTier = option.tier)"
                      :disabled="!option.eligible"
                      :class="[
                        'px-3 py-2 rounded-md border text-sm transition-colors',
                        selectedCaptainTier === option.tier ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                        !option.eligible ? 'opacity-40 cursor-not-allowed hover:bg-white' : ''
                      ]"
                    >
                      {{ option.tier }} · {{ option.count }}人
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="flex flex-wrap gap-2">
                <button @click="drawAuctionPlayer" :disabled="!auctionState.actions?.canDrawPlayer || isAuctionLoading" class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
                  下一位
                </button>
                <button @click="finishAuctionCurrent" :disabled="!auctionState.actions?.canFinishCurrent || isAuctionLoading" class="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors">
                  拍卖成交
                </button>
                <button @click="passAuctionCurrent" :disabled="!auctionState.actions?.canPassCurrent || isAuctionLoading" class="px-4 py-2 rounded-md bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:bg-gray-300 transition-colors">
                  流拍
                </button>
              </div>
            </div>

            <AuctionBoard
              :state="auctionState"
              viewer="admin"
              @manual-assign="manualAssignAuctionPlayer"
            />
          </div>

          <div v-else class="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-gray-500">
            正在加载拍卖分队信息...
          </div>
        </div>

        <!-- Announcement Management -->
        <div v-if="currentTab === 'announcement'">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">赛事公告管理</h2>
            <div class="space-x-3">
              <button @click="clearAnnouncement" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                清除当前公告
              </button>
              <button @click="saveAnnouncement" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                保存并发布公告
              </button>
            </div>
          </div>
          <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">公告标题</label>
              <input type="text" v-model="announcement.title" placeholder="例如：2026春季赛开赛公告" class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">赛事开始时间</label>
              <input type="datetime-local" v-model="announcement.startTime" class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">赛制及详细说明</label>
              <textarea v-model="announcement.content" rows="8" placeholder="在这里输入赛制说明、奖励规则等详细信息..." class="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"></textarea>
            </div>
          </div>
        </div>

        <!-- Schedule Management -->
        <div v-if="currentTab === 'schedule'">
          <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <div class="flex items-center gap-3">
              <h2 class="text-2xl font-bold text-gray-800">赛程安排</h2>
              <div class="flex rounded-md border border-gray-200 overflow-hidden">
                <button @click="setScheduleMode('5v5')" :class="scheduleMode === '5v5' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'" class="px-3 py-1.5 text-sm font-medium transition-colors">
                  5V5
                </button>
              <button @click="setScheduleMode('6v6')" :class="scheduleMode === '6v6' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'" class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200">
                  6V6
                </button>
                <!-- 拍卖分队当前只发布队伍信息，不在赛程安排页启用对局管理。
                <button @click="setScheduleMode('auction')" :class="scheduleMode === 'auction' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'" class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200">
                  拍卖分队
                </button>
                -->
              </div>
            </div>
            <div class="space-x-3">
              <button @click="saveScheduleChanges" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                保存修改
              </button>
              <button @click="publishSchedule()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                重新发布赛程
              </button>
              <button @click="clearSchedule()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                清空赛程
              </button>
            </div>
          </div>
          <div class="space-y-4">
            <div v-for="(match, index) in matches" :key="match.id" class="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center bg-white shadow-sm hover:shadow transition-shadow">
              <div class="flex items-center space-x-2 mb-2 sm:mb-0">
                <button @click="moveMatchUp(index)" :disabled="index === 0" class="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                  <ArrowUp class="w-4 h-4" />
                </button>
                <button @click="moveMatchDown(index)" :disabled="index === matches.length - 1" class="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30">
                  <ArrowDown class="w-4 h-4" />
                </button>
              </div>
              <div class="flex items-center space-x-4 flex-1 justify-center">
                <span class="font-bold text-lg w-24 text-right">{{ match.teamA }}</span>
                <div class="flex flex-col items-center justify-center">
                  <span v-if="match.scoreA !== undefined && match.scoreB !== undefined && match.scoreA !== null && match.scoreB !== null" class="text-xl font-bold text-blue-600 px-2">
                    {{ match.scoreA }} : {{ match.scoreB }}
                  </span>
                  <span v-else class="text-gray-400 font-semibold px-2">VS</span>
                </div>
                <span class="font-bold text-lg w-24 text-left">{{ match.teamB }}</span>
              </div>
              <div class="w-full sm:w-auto flex justify-center sm:justify-end mt-4 sm:mt-0 space-x-3 items-center">
                <select v-model="match.status" class="border border-gray-300 rounded-md text-sm py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                  <option value="pending">待定</option>
                  <option value="ongoing">进行中</option>
                  <option value="completed">已结束</option>
                </select>
                <button @click="openScoreModal(match.id)" class="text-sm text-blue-600 hover:text-blue-800 border border-blue-600 hover:bg-blue-50 px-3 py-1 rounded whitespace-nowrap">录入比分</button>
              </div>
            </div>
            <div v-if="matches.length === 0" class="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-gray-500">
              暂无赛程安排，请先完成分队后点击上方"重新发布赛程"按钮
            </div>
          </div>
        </div>

        <!-- Donation Management -->
        <div v-if="currentTab === 'donation'">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">打赏管理</h2>
          </div>
          
          <!-- 打赏人员管理 -->
          <div class="mb-8 border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 class="font-bold text-gray-700">打赏人员 (按金额降序)</h3>
              <div class="flex space-x-2">
                <input type="text" v-model="searchDonatorText" placeholder="搜索打赏人员" class="border border-gray-300 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48">
                <button @click="handleAddDonator" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                  添加人员
                </button>
              </div>
            </div>
            <div class="p-4">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">打赏金额</th>
                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="item in filteredDonators" :key="item.id">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.name }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.amount }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button @click="handleEditDonator(item)" class="text-blue-600 hover:text-blue-900">编辑</button>
                      <button @click="handleDeleteDonator(item.id)" class="text-red-600 hover:text-red-900">删除</button>
                    </td>
                  </tr>
                  <tr v-if="filteredDonators.length === 0">
                    <td colspan="3" class="px-6 py-8 text-center text-gray-500">暂无打赏人员</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 运营团队管理 -->
          <div class="mb-8 border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 class="font-bold text-gray-700">运营团队</h3>
              <div class="flex space-x-2">
                <input type="text" v-model="searchOperatorText" placeholder="搜索运营成员" class="border border-gray-300 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48">
                <button @click="handleAddOperator" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                  添加成员
                </button>
              </div>
            </div>
            <div class="p-4">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="item in filteredOperators" :key="item.id">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.name }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button @click="handleEditOperator(item)" class="text-blue-600 hover:text-blue-900">编辑</button>
                      <button @click="handleDeleteOperator(item.id)" class="text-red-600 hover:text-red-900">删除</button>
                    </td>
                  </tr>
                  <tr v-if="filteredOperators.length === 0">
                    <td colspan="2" class="px-6 py-8 text-center text-gray-500">暂无运营人员</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 管理员打赏联系方式管理 -->
          <div class="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 class="font-bold text-gray-700">管理员打赏联系方式 (最多5个)</h3>
              <button @click="handleAddContact" :disabled="adminContacts.length >= 5" :class="adminContacts.length >= 5 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'" class="text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                添加联系方式
              </button>
            </div>
            <div class="p-4">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系内容</th>
                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="item in adminContacts" :key="item.id">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span v-if="item.type === 'qq'" class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">QQ</span>
                      <span v-else-if="item.type === 'wechat'" class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">微信</span>
                      <span v-else-if="item.type === 'email'" class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">邮箱</span>
                      <span v-else class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{{ item.type }}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.value }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button @click="handleEditContact(item)" class="text-blue-600 hover:text-blue-900">编辑</button>
                      <button @click="handleDeleteContact(item.id)" class="text-red-600 hover:text-red-900">删除</button>
                    </td>
                  </tr>
                  <tr v-if="adminContacts.length === 0">
                    <td colspan="3" class="px-6 py-8 text-center text-gray-500">暂无联系方式</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Score Modal -->
        <div v-if="showScoreModal" class="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4" style="background-color: rgba(0, 0, 0, 0.25);">
          <div class="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 class="text-xl font-bold text-gray-800 mb-6 text-center">录入比分</h3>
            <div class="flex justify-between items-center mb-8">
              <div class="flex-1 flex flex-col items-center">
                <div class="font-bold text-lg mb-3 truncate w-full text-center">{{ matches.find(m => m.id === currentMatchId)?.teamA }}</div>
                <input type="number" v-model="scoreInputA" min="0" class="w-20 border border-gray-300 rounded-md p-2 text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              </div>
              <div class="px-4 font-bold text-gray-400 text-2xl">:</div>
              <div class="flex-1 flex flex-col items-center">
                <div class="font-bold text-lg mb-3 truncate w-full text-center">{{ matches.find(m => m.id === currentMatchId)?.teamB }}</div>
                <input type="number" v-model="scoreInputB" min="0" class="w-20 border border-gray-300 rounded-md p-2 text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              </div>
            </div>
            <div class="flex justify-end space-x-3">
              <button @click="closeScoreModal" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors">取消</button>
              <button @click="saveScore" class="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">保存比分</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Autofill Modal -->
    <div v-if="autofillModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 transition-opacity" style="background-color: rgba(0, 0, 0, 0.25);">
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 transform transition-all">
        <h3 class="text-lg font-medium text-gray-900 mb-4">{{ teamModeConfigs[autofillModal.mode].label }} 自动填充</h3>
        <p class="text-sm text-gray-500 mb-4">请选择要分配的微信群。系统将自动挑选该群的玩家填入本对战组的两支队伍中，并尽量保证双方实力均衡。</p>
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">目标微信群</label>
          <select v-model="autofillModal.wechatGroup" class="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            <option value="">所有群混合 (不限制群)</option>
            <option v-for="group in autofillModal.options" :key="group" :value="group">{{ group }}</option>
          </select>
        </div>

        <div class="flex justify-end space-x-3">
          <button @click="closeAutofillModal" class="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors">
            取消
          </button>
          <button @click="confirmAutofill" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium transition-colors shadow-sm">
            开始填充
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="customConfirm.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 transition-opacity" style="background-color: rgba(0, 0, 0, 0.25);">
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 transform transition-all">
        <h3 class="text-lg font-medium text-gray-900 mb-4">提示</h3>
        <p class="text-sm text-gray-500 whitespace-pre-wrap mb-6">{{ customConfirm.message }}</p>
        <div class="flex justify-end space-x-3">
          <button @click="handleConfirmNo" class="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors">
            取消
          </button>
          <button @click="handleConfirmYes" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium transition-colors">
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
