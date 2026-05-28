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

import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
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
}
