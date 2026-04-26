import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsService } from './comments.service';

@Controller('api/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('events/:eventId')
  getByEvent(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.commentsService.getByEvent(eventId, userId);
  }

  @Get('events/:eventId/count')
  getCountByEvent(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.commentsService.getCountByEvent(eventId);
  }

  @Post('events/:eventId')
  create(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() dto: CreateCommentDto,
    @Headers('x-user-id') userId?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Connexion requise');
    }
    return this.commentsService.create(eventId, userId, dto.content);
  }

  @Post(':commentId/likes/toggle')
  toggleLike(
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Connexion requise');
    }
    return this.commentsService.toggleLike(commentId, userId);
  }

  @Delete(':commentId')
  deleteComment(
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    if (userRole !== 'Admin') {
      throw new ForbiddenException('Accès administrateur requis');
    }

    return this.commentsService.deleteComment(commentId);
  }
}
