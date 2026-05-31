import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Projects')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: any) {
    return this.projectsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List projects (filtered, paginated)' })
  findAll(@Query() filters: FilterProjectsDto, @CurrentUser() user: any) {
    return this.projectsService.findAll(user.id, user.role, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.findOne(id, user.id, user.role);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get project activity feed' })
  findActivity(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.findActivity(id, user.id, user.role, Number(limit || 100));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: any) {
    return this.projectsService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete project' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.remove(id, user.id, user.role);
  }

  @Post(':id/members/:userId')
  @ApiOperation({ summary: 'Add member to project' })
  addMember(
    @Param('id') id: string,
    @Param('userId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.addMember(id, memberId, user.id, user.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member from project' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.removeMember(id, memberId, user.id, user.role);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave project as current member' })
  leaveProject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.leave(id, user.id, user.role);
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role in project' })
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.updateMemberRole(id, memberId, dto.role, user.id, user.role);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer project ownership to another member' })
  transferOwnership(
    @Param('id') id: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.transferOwnership(id, dto.userId, user.id, user.role);
  }

  @Get(':id/invitations')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'List project invitations' })
  listInvitations(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.listInvitations(id, user.id, user.role);
  }

  @Post(':id/invitations')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Invite member by email' })
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.inviteMember(id, dto, user.id, user.role);
  }
}
